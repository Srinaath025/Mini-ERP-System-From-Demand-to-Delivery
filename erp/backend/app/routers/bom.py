from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth
from ..audit import log_audit

router = APIRouter(prefix="/api/bom", tags=["Bills of Materials"])

def verify_read(current_user: models.User = Depends(auth.PermissionChecker("manufacturing_order"))):
    return current_user

def verify_write(current_user: models.User = Depends(verify_read)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Write operations are restricted to Admin users.")
    return current_user

@router.get("", response_model=List[schemas.BOMResponse])
def list_boms(db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    return db.query(models.BOM).all()

@router.get("/product/{sku}", response_model=schemas.BOMResponse)
def get_bom_by_product(sku: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    bom = db.query(models.BOM).filter(models.BOM.product_sku == sku).first()
    if not bom:
        raise HTTPException(status_code=404, detail=f"No BOM found for product {sku}")
    return bom

@router.get("/{id}", response_model=schemas.BOMResponse)
def get_bom(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    bom = db.query(models.BOM).filter(models.BOM.id == id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    return bom

@router.post("", response_model=schemas.BOMResponse, status_code=status.HTTP_201_CREATED)
def create_bom(bom_in: schemas.BOMCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Creation and deletion are restricted to Admin users.")
    # Check if a BOM already exists for this product
    existing = db.query(models.BOM).filter(models.BOM.product_sku == bom_in.product_sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"BOM already exists for product {bom_in.product_sku}")

    # Validate output product exists
    target_product = db.query(models.Product).filter(models.Product.sku == bom_in.product_sku).first()
    if not target_product:
        raise HTTPException(status_code=400, detail=f"Target product {bom_in.product_sku} not found")

    # Validate component products exist
    for comp in bom_in.components:
        comp_product = db.query(models.Product).filter(models.Product.sku == comp.component_sku).first()
        if not comp_product:
            raise HTTPException(status_code=400, detail=f"Component product {comp.component_sku} not found")

    bom = models.BOM(
        product_sku=bom_in.product_sku,
        name=bom_in.name,
        description=bom_in.description,
        quantity=bom_in.quantity,
        unit=bom_in.unit,
        reference=bom_in.reference
    )

    for comp in bom_in.components:
        bom.components.append(
            models.BOMComponent(
                component_sku=comp.component_sku,
                quantity=comp.quantity
            )
        )

    for op in bom_in.operations:
        bom.operations.append(
            models.BOMOperation(
                operation_name=op.operation_name,
                duration_mins=op.duration_mins,
                work_center=op.work_center
            )
        )

    db.add(bom)
    
    # Audit logging
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Manufacturing",
        record_type="BOM",
        record_id=bom_in.product_sku,
        action="Created"
    )
    
    db.commit()
    db.refresh(bom)
    return bom

@router.put("/{id}", response_model=schemas.BOMResponse)
def update_bom(id: int, bom_in: schemas.BOMCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    bom = db.query(models.BOM).filter(models.BOM.id == id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    # Validate target product exists
    target_product = db.query(models.Product).filter(models.Product.sku == bom_in.product_sku).first()
    if not target_product:
        raise HTTPException(status_code=400, detail=f"Target product {bom_in.product_sku} not found")

    # Validate component products exist
    for comp in bom_in.components:
        comp_product = db.query(models.Product).filter(models.Product.sku == comp.component_sku).first()
        if not comp_product:
            raise HTTPException(status_code=400, detail=f"Component product {comp.component_sku} not found")

    # Update basic details
    bom.product_sku = bom_in.product_sku
    bom.name = bom_in.name
    bom.description = bom_in.description
    bom.quantity = bom_in.quantity
    bom.unit = bom_in.unit
    bom.reference = bom_in.reference

    # Delete existing components and operations first
    db.query(models.BOMComponent).filter(models.BOMComponent.bom_id == id).delete()
    db.query(models.BOMOperation).filter(models.BOMOperation.bom_id == id).delete()

    for comp in bom_in.components:
        bom.components.append(
            models.BOMComponent(
                component_sku=comp.component_sku,
                quantity=comp.quantity
            )
        )

    for op in bom_in.operations:
        bom.operations.append(
            models.BOMOperation(
                operation_name=op.operation_name,
                duration_mins=op.duration_mins,
                work_center=op.work_center
            )
        )

    # Audit logging
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Manufacturing",
        record_type="BOM",
        record_id=bom.product_sku,
        action="Updated",
        field_changed="BOM Details"
    )

    db.commit()
    db.refresh(bom)
    return bom

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bom(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Creation and deletion are restricted to Admin users.")
    bom = db.query(models.BOM).filter(models.BOM.id == id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    sku = bom.product_sku

    # Audit logging
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Manufacturing",
        record_type="BOM",
        record_id=sku,
        action="Deleted"
    )

    db.delete(bom)
    db.commit()
    return None

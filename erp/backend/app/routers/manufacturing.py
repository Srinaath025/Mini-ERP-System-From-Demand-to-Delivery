from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from ..database import get_db
from .. import models, schemas, auth
from ..audit import log_audit

router = APIRouter(prefix="/api/manufacturing", tags=["Manufacturing Orders"])

def verify_read(current_user: models.User = Depends(auth.PermissionChecker("manufacturing_order"))):
    return current_user

def verify_write(current_user: models.User = Depends(verify_read)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Write operations are restricted to Admin users.")
    return current_user

@router.get("", response_model=List[schemas.ManufacturingOrderResponse])
def list_manufacturing_orders(db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    return db.query(models.ManufacturingOrder).order_by(models.ManufacturingOrder.start_date.desc()).all()

@router.get("/{mo_number}", response_model=schemas.ManufacturingOrderResponse)
def get_manufacturing_order(mo_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    mo = db.query(models.ManufacturingOrder).filter(models.ManufacturingOrder.mo_number == mo_number).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing Order not found")
    return mo

@router.post("", response_model=schemas.ManufacturingOrderResponse, status_code=status.HTTP_201_CREATED)
def create_manufacturing_order(mo_in: schemas.ManufacturingOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    if mo_in.status in ["Confirmed", "In Progress", "Completed"] and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Confirming or completing manufacturing orders is restricted to Admin users.")
    mo_number = mo_in.mo_number
    if not mo_number or mo_number == "":
        from datetime import date
        year = date.today().year
        count = db.query(models.ManufacturingOrder).count()
        mo_number = f"MO-{year}-{count + 1:03d}"
        while db.query(models.ManufacturingOrder).filter(models.ManufacturingOrder.mo_number == mo_number).first():
            count += 1
            mo_number = f"MO-{year}-{count + 1:03d}"
    else:
        existing = db.query(models.ManufacturingOrder).filter(models.ManufacturingOrder.mo_number == mo_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="Manufacturing Order Number already exists")

    # Validate output product exists
    target_product = db.query(models.Product).filter(models.Product.sku == mo_in.product_sku).first()
    if not target_product:
            raise HTTPException(status_code=400, detail=f"Target product {mo_in.product_sku} not found")

    components_to_create = []

    # Validate components and stock
    for comp in mo_in.components:
        comp_product = db.query(models.Product).filter(models.Product.sku == comp.component_sku).first()
        if not comp_product:
            raise HTTPException(status_code=400, detail=f"Component product {comp.component_sku} not found")

        # If switching directly to Completed, check stock
        if mo_in.status == "Completed" and comp_product.stock_level < comp.required_qty:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for component {comp_product.name}. Required: {comp.required_qty}, Available: {comp_product.stock_level}"
            )

        components_to_create.append(
            models.MOComponent(
                component_sku=comp.component_sku,
                required_qty=comp.required_qty,
                unit=comp.unit,
                # Allocation triggers directly on Completed status
                status="Issued" if mo_in.status == "Completed" else (comp.status or ("Allocated" if mo_in.status == "Confirmed" else "Pending"))
            )
        )

    mo = models.ManufacturingOrder(
        mo_number=mo_number,
        product_sku=mo_in.product_sku,
        quantity=mo_in.quantity,
        start_date=mo_in.start_date,
        end_date=mo_in.end_date,
        status=mo_in.status,
        notes=mo_in.notes
    )

    for comp in components_to_create:
        mo.components.append(comp)
        
        # If completed, deduct component stock
        if mo_in.status == "Completed":
            comp_product = db.query(models.Product).filter(models.Product.sku == comp.component_sku).first()
            comp_product.stock_level -= int(comp.required_qty)
            comp.status = "Issued"

    # If completed, add finished product stock
    if mo_in.status == "Completed":
        target_product.stock_level += mo_in.quantity

    db.add(mo)
    
    # --- Audit log creation for MO ---
    # Log that the Manufacturing Order has been created under the Manufacturing module
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Manufacturing",
        record_type="Manufacturing Order",
        record_id=mo.mo_number,
        action="Created"
    )
    
    # --- Audit log creation for BOM ---
    # Log that the corresponding BOM list has also been created (BOM ID maps to MO ID prefix)
    bom_id = mo.mo_number.replace("MO-", "BOM-") if "MO-" in mo.mo_number else f"BOM-{mo.mo_number}"
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Manufacturing",
        record_type="BOM",
        record_id=bom_id,
        action="Created"
    )
    
    db.commit()
    db.refresh(mo)
    return mo

@router.put("/{mo_number}", response_model=schemas.ManufacturingOrderResponse)
def update_manufacturing_order(mo_number: str, mo_in: schemas.ManufacturingOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    mo = db.query(models.ManufacturingOrder).filter(models.ManufacturingOrder.mo_number == mo_number).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing Order not found")

    old_status = mo.status
    target_product = db.query(models.Product).filter(models.Product.sku == mo_in.product_sku).first()
    if not target_product:
        raise HTTPException(status_code=400, detail=f"Target product {mo_in.product_sku} not found")

    old_product_sku = mo.product_sku
    old_quantity = mo.quantity
    old_components = [(comp.component_sku, comp.required_qty) for comp in mo.components]

    if old_status == "Completed":
        old_target = db.query(models.Product).filter(models.Product.sku == old_product_sku).first()
        if old_target:
            old_target.stock_level -= old_quantity
        for old_comp_sku, old_required_qty in old_components:
            comp_product = db.query(models.Product).filter(models.Product.sku == old_comp_sku).first()
            if comp_product:
                comp_product.stock_level += int(old_required_qty)

    # Remove existing components
    db.query(models.MOComponent).filter(models.MOComponent.mo_number == mo_number).delete()

    for comp in mo_in.components:
        comp_product = db.query(models.Product).filter(models.Product.sku == comp.component_sku).first()
        if not comp_product:
            raise HTTPException(status_code=400, detail=f"Component product {comp.component_sku} not found")

        if mo_in.status == "Completed" and comp_product.stock_level < comp.required_qty:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for component {comp_product.name} to complete order."
            )

        new_comp = models.MOComponent(
            mo_number=mo_number,
            component_sku=comp.component_sku,
            required_qty=comp.required_qty,
            unit=comp.unit,
            status="Issued" if mo_in.status == "Completed" else (comp.status or ("Allocated" if mo_in.status == "Confirmed" else "Pending"))
        )
        db.add(new_comp)

        if mo_in.status == "Completed":
            comp_product.stock_level -= int(comp.required_qty)

    if mo_in.status == "Completed":
        target_product.stock_level += mo_in.quantity

    # Update MO Details
    mo.product_sku = mo_in.product_sku
    mo.quantity = mo_in.quantity
    mo.start_date = mo_in.start_date
    mo.end_date = mo_in.end_date
    mo.status = mo_in.status
    mo.notes = mo_in.notes

    # --- Audit log update for MO ---
    # If the manufacturing order status has changed, we log a Status change
    if old_status != mo.status:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module="Manufacturing",
            record_type="Manufacturing Order",
            record_id=mo.mo_number,
            action="Updated",
            field_changed="Status",
            old_value=old_status,
            new_value=mo.status
        )
        
        # --- Audit log update for Material Consumption ---
        # When the manufacturing order switches to 'Completed', materials are consumed.
        # We record this material consumption update using an MC- prefix.
        mc_id = mo.mo_number.replace("MO-", "MC-") if "MO-" in mo.mo_number else f"MC-{mo.mo_number}"
        if mo.status == "Completed":
            log_audit(
                db=db,
                user_id=current_user.id,
                user_name=current_user.name,
                module="Manufacturing",
                record_type="Material Consumption",
                record_id=mc_id,
                action="Updated",
                field_changed="Consumed Qty",
                old_value="0",
                new_value=str(mo.quantity)
            )
    # Otherwise, if other fields were changed, we log general details update
    else:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module="Manufacturing",
            record_type="Manufacturing Order",
            record_id=mo.mo_number,
            action="Updated",
            field_changed="Order Details"
        )

    db.commit()
    db.refresh(mo)
    return mo

@router.delete("/{mo_number}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manufacturing_order(mo_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Creation and deletion are restricted to Admin users.")
    mo = db.query(models.ManufacturingOrder).filter(models.ManufacturingOrder.mo_number == mo_number).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing Order not found")

    # If it was completed, revert the stock changes
    if mo.status == "Completed":
        # Deduct target product
        target_product = db.query(models.Product).filter(models.Product.sku == mo.product_sku).first()
        if target_product:
            target_product.stock_level -= mo.quantity
            
        # Return component stock
        for comp in mo.components:
            comp_product = db.query(models.Product).filter(models.Product.sku == comp.component_sku).first()
            if comp_product:
                comp_product.stock_level += int(comp.required_qty)

    # --- Audit log deletion for MO ---
    # Log that the Manufacturing Order has been deleted under the Manufacturing module
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Manufacturing",
        record_type="Manufacturing Order",
        record_id=mo.mo_number,
        action="Deleted"
    )

    db.delete(mo)
    db.commit()
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal
from ..database import get_db
from .. import models, schemas, auth
from ..audit import log_audit, get_product_record_type

def populate_computed_qty(db: Session, product: models.Product):
    if not product:
        return product
    # Reserved demand is stock committed to confirmed sales and planned production.
    reserved_sales = db.query(func.coalesce(func.sum(models.SalesOrderItem.quantity), 0))\
        .join(models.SalesOrder)\
        .filter(models.SalesOrderItem.product_sku == product.sku)\
        .filter(models.SalesOrder.status == 'Confirmed')\
        .scalar()

    reserved_mfg = db.query(func.coalesce(func.sum(models.MOComponent.required_qty), 0))\
        .join(models.ManufacturingOrder)\
        .filter(models.MOComponent.component_sku == product.sku)\
        .filter(models.ManufacturingOrder.status.in_(["Draft", "Confirmed"]))\
        .scalar()

    product.reserved_qty = int(reserved_sales + reserved_mfg)
    product.free_to_use_qty = max(int(product.stock_level - product.reserved_qty), 0)
    
    bom = db.query(models.BOM).filter(models.BOM.product_sku == product.sku).first()
    product.bom_id = bom.id if bom else None
    product.bom_name = bom.name if bom else None
    
    return product

router = APIRouter(prefix="/api/products", tags=["Products"])

# Check read permission
def verify_read(current_user: models.User = Depends(auth.PermissionChecker("products"))):
    return current_user

# Check write permission (requires product permission + check if they are not just read-only)
# For this ERP, anyone with product permission can edit, but Viewer can only read.
# Let's check role to enforce that Viewer role is read-only.
def verify_write(current_user: models.User = Depends(verify_read)):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Write operations are restricted to Admin users."
        )
    return current_user

from typing import Optional
def validate_and_sanitize_product(data: dict, bom_id: Optional[int], db: Session):
    strategy = data.get("procurement_strategy", "MTS")
    proc_type = data.get("procurement_type")
    
    # Map standard UI terms to internal representation
    if proc_type == "Purchase":
        data["procurement_type"] = "Vendor"
        proc_type = "Vendor"
    elif proc_type == "Manufacturing":
        data["procurement_type"] = "BOM"
        proc_type = "BOM"

    if strategy == "MTS":
        data["procure_on_demand"] = False
        data["procurement_type"] = None
        data["vendor"] = None
        bom_id = None
    elif strategy == "MTO":
        data["procure_on_demand"] = True
        if not proc_type:
            raise HTTPException(status_code=400, detail="Procurement Type is required for MTO strategy.")
        
        if proc_type in ["Purchase", "Vendor"]:
            if not data.get("vendor"):
                raise HTTPException(status_code=400, detail="Vendor is required for Purchase procurement.")
            bom_id = None
        elif proc_type in ["Manufacturing", "BOM"]:
            if not bom_id or bom_id == 0:
                raise HTTPException(status_code=400, detail="Bill of Materials (BoM) is required for Manufacturing procurement.")
            # Verify BoM exists
            bom_exists = db.query(models.BOM).filter(models.BOM.id == bom_id).first()
            if not bom_exists:
                raise HTTPException(status_code=400, detail="The selected BoM does not exist.")
            data["vendor"] = None
        else:
            raise HTTPException(status_code=400, detail="Invalid Procurement Type.")
            
    return data, bom_id

@router.get("", response_model=List[schemas.ProductResponse])
def list_products(db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    products = db.query(models.Product).all()
    for p in products:
        populate_computed_qty(db, p)
    return products

@router.get("/{sku}", response_model=schemas.ProductResponse)
def get_product(sku: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    product = db.query(models.Product).filter(models.Product.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return populate_computed_qty(db, product)

@router.post("", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    existing = db.query(models.Product).filter(models.Product.sku == product_in.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product code already exists")
        
    data = product_in.dict()
    bom_id = data.pop("bom_id", None)
    data, bom_id = validate_and_sanitize_product(data, bom_id, db)
    product = models.Product(**data)
    db.add(product)
    db.flush()
    
    if bom_id is not None and bom_id != 0:
        bom = db.query(models.BOM).filter(models.BOM.id == bom_id).first()
        if bom:
            bom.product_sku = product.sku

    
    # --- Audit log creation ---
    # Determine the module name based on user role or category of the product.
    # If the user is a Purchase Manager, or if the product is a raw component, we log it under the 'Purchase' module.
    # Otherwise, we log it under the 'Sales' module.
    if product.procurement_type == "Purchase":
        product.procurement_type = "Vendor"
    if product.procurement_type == "Manufacturing":
        product.procurement_type = "BOM"
    module_name = "Purchase" if current_user.role == "Purchase Manager" or product.procurement_type == "Vendor" or (product.category and product.category.lower() in ["component", "raw material", "memory", "chassis"]) else "Sales"
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module=module_name,
        record_type=get_product_record_type(product.sku),
        record_id=product.sku,
        action="Created"
    )
    
    db.commit()
    db.refresh(product)
    return populate_computed_qty(db, product)

@router.put("/{sku}", response_model=schemas.ProductResponse)
def update_product(sku: str, product_in: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    product = db.query(models.Product).filter(models.Product.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Capture old values for audit comparisons
    old_price = product.price
    old_stock = product.stock_level
    old_name = product.name
    
    data = product_in.dict()
    bom_id = data.pop("bom_id", None)
    data, bom_id = validate_and_sanitize_product(data, bom_id, db)
    
    # Update fields
    for field, value in data.items():
        setattr(product, field, value)
        
    # Update BOM association
    current_bom = db.query(models.BOM).filter(models.BOM.product_sku == sku).first()
    if bom_id is not None and bom_id != 0:
        if current_bom and current_bom.id != bom_id:
            db.delete(current_bom)
            db.flush()
        selected_bom = db.query(models.BOM).filter(models.BOM.id == bom_id).first()
        if selected_bom:
            selected_bom.product_sku = sku
    else:
        if current_bom:
            db.delete(current_bom)

        
    # --- Audit log updates ---
    # Match the module context (Purchase for components/managers, Sales for finished items)
    module_name = "Purchase" if current_user.role == "Purchase Manager" or (product.category and product.category.lower() in ["component", "raw material", "memory", "chassis"]) else "Sales"
    
    # Check if the product price has changed
    if old_price != product.price:
        # For purchases, we label it as 'Cost Price'. For sales, it is labeled as 'Sales Price'.
        field_name = "Cost Price" if module_name == "Purchase" else "Sales Price"
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module=module_name,
            record_type=get_product_record_type(product.sku),
            record_id=product.sku,
            action="Updated",
            field_changed=field_name,
            old_value=f"₹{old_price:.2f}" if isinstance(old_price, (int, float, Decimal)) else str(old_price),
            new_value=f"₹{product.price:.2f}" if isinstance(product.price, (int, float, Decimal)) else str(product.price)
        )
        
    # Check if the product stock level has changed
    if old_stock != product.stock_level:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module=module_name,
            record_type=get_product_record_type(product.sku),
            record_id=product.sku,
            action="Updated",
            field_changed="Stock Level",
            old_value=str(old_stock),
            new_value=str(product.stock_level)
        )
        
    # Check if name changed (only logged if price/stock did not change to avoid redundant entries)
    if old_name != product.name and old_price == product.price and old_stock == product.stock_level:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module=module_name,
            record_type=get_product_record_type(product.sku),
            record_id=product.sku,
            action="Updated",
            field_changed="Name",
            old_value=old_name,
            new_value=product.name
        )
        
    db.commit()
    db.refresh(product)
    return populate_computed_qty(db, product)

@router.delete("/{sku}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(sku: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    product = db.query(models.Product).filter(models.Product.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # --- Audit log deletion ---
    # Log that the product has been deleted under the appropriate module context
    module_name = "Purchase" if current_user.role == "Purchase Manager" or (product.category and product.category.lower() in ["component", "raw material", "memory", "chassis"]) else "Sales"
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module=module_name,
        record_type=get_product_record_type(product.sku),
        record_id=product.sku,
        action="Deleted"
    )
    
    db.delete(product)
    db.commit()
    return None

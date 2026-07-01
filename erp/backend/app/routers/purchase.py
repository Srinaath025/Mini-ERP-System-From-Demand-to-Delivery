from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
from ..database import get_db
from .. import models, schemas, auth
from ..audit import log_audit

router = APIRouter(prefix="/api/purchases", tags=["Purchase Orders"])

def verify_read(current_user: models.User = Depends(auth.PermissionChecker("purchase_order"))):
    return current_user

def verify_write(current_user: models.User = Depends(verify_read)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Write operations are restricted to Admin users.")
    return current_user

@router.get("", response_model=List[schemas.PurchaseOrderResponse])
def list_purchase_orders(db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    return db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.order_date.desc()).all()

@router.get("/{po_number}", response_model=schemas.PurchaseOrderResponse)
def get_purchase_order(po_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po

@router.post("", response_model=schemas.PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(po_in: schemas.PurchaseOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    if po_in.status in ["Confirmed", "Received"] and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Approving purchase orders is restricted to Admin users.")
    po_number = po_in.po_number
    if not po_number or po_number == "":
        from datetime import date
        year = date.today().year
        count = db.query(models.PurchaseOrder).count()
        po_number = f"PO-{year}-{count + 1:03d}"
        while db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first():
            count += 1
            po_number = f"PO-{year}-{count + 1:03d}"
    else:
        existing = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="Purchase Order Number already exists")

    subtotal = Decimal('0.00')
    items_to_create = []

    for item in po_in.items:
        product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_sku} not found")

        total_item_price = Decimal(str(item.unit_price)) * item.quantity
        subtotal += total_item_price

        items_to_create.append(
            models.PurchaseOrderItem(
                product_sku=item.product_sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=total_item_price
            )
        )

    tax_rate = Decimal(str(po_in.tax))
    shipping_val = Decimal(str(po_in.shipping))
    tax_amt = subtotal * tax_rate
    total_amt = subtotal + tax_amt + shipping_val

    po = models.PurchaseOrder(
        po_number=po_number,
        supplier_name=po_in.supplier_name,
        order_date=po_in.order_date,
        status=po_in.status,
        subtotal=subtotal,
        tax=tax_amt,
        shipping=shipping_val,
        total=total_amt,
        notes=po_in.notes
    )

    for item in items_to_create:
        po.items.append(item)
        
        if po_in.status == "Received":
            product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
            product.stock_level += item.quantity

    db.add(po)
    
    # --- Audit log creation ---
    # Log that the Purchase Order has been created under the Purchase module context
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Purchase",
        record_type="Purchase Order",
        record_id=po.po_number,
        action="Created"
    )
    
    db.commit()
    db.refresh(po)
    return po

@router.put("/{po_number}", response_model=schemas.PurchaseOrderResponse)
def update_purchase_order(po_number: str, po_in: schemas.PurchaseOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    old_status = po.status
    old_items = [(item.product_sku, item.quantity) for item in po.items]
    subtotal = Decimal('0.00')

    if old_status == "Received":
        for old_sku, old_qty in old_items:
            product = db.query(models.Product).filter(models.Product.sku == old_sku).first()
            if product:
                product.stock_level -= old_qty

    # Remove existing items first
    db.query(models.PurchaseOrderItem).filter(models.PurchaseOrderItem.po_number == po_number).delete()

    for item in po_in.items:
        product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_sku} not found")

        total_item_price = Decimal(str(item.unit_price)) * item.quantity
        subtotal += total_item_price

        new_item = models.PurchaseOrderItem(
            po_number=po_number,
            product_sku=item.product_sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=total_item_price
        )
        db.add(new_item)

        # Handle stock updates
        if po_in.status == "Received":
            product.stock_level += item.quantity

    tax_rate = Decimal(str(po_in.tax))
    shipping_val = Decimal(str(po_in.shipping))
    tax_amt = subtotal * tax_rate
    total_amt = subtotal + tax_amt + shipping_val

    # Update PO details
    po.supplier_name = po_in.supplier_name
    po.order_date = po_in.order_date
    po.status = po_in.status
    po.subtotal = subtotal
    po.tax = tax_amt
    po.shipping = shipping_val
    po.total = total_amt
    po.notes = po_in.notes

    # --- Audit log update ---
    # If the order status has changed, we log a Status change.
    if old_status != po.status:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module="Purchase",
            record_type="Purchase Order",
            record_id=po.po_number,
            action="Updated",
            field_changed="Status",
            old_value=old_status,
            new_value=po.status
        )
    # Otherwise, if fields other than status were updated, we log general details update
    else:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module="Purchase",
            record_type="Purchase Order",
            record_id=po.po_number,
            action="Updated",
            field_changed="Order Details"
        )

    db.commit()
    db.refresh(po)
    return po

@router.delete("/{po_number}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase_order(po_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_write)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Creation and deletion are restricted to Admin users.")
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    if po.status == "Received":
        for item in po.items:
            product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
            if product:
                product.stock_level -= item.quantity

    # --- Audit log deletion ---
    # Log that the Purchase Order has been deleted under the Purchase module context
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Purchase",
        record_type="Purchase Order",
        record_id=po.po_number,
        action="Deleted"
    )

    db.delete(po)
    db.commit()
    return None

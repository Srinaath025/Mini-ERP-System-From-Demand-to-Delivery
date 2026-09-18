from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from decimal import Decimal
from datetime import date
from ..database import get_db
from .. import models, schemas, auth
from ..audit import log_audit

def trigger_mto_automation(db: Session, items, so_number: str, so_status: str, current_user: models.User):
    # Only confirmed sales orders trigger on-demand replenishment (draft/cancelled orders do not)
    if so_status != "Confirmed":
        return

    for item in items:
        product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
        if product and getattr(product, "procure_on_demand", False):
            # Calculate committed reservations for this product by OTHER confirmed sales orders
            reserved_sales = db.query(func.coalesce(func.sum(models.SalesOrderItem.quantity), 0))\
                .join(models.SalesOrder)\
                .filter(models.SalesOrderItem.product_sku == product.sku)\
                .filter(models.SalesOrder.status == 'Confirmed')\
                .filter(models.SalesOrder.so_number != so_number)\
                .scalar()

            available_stock = max(0, product.stock_level - int(reserved_sales))
            shortage = item.quantity - available_stock

            if shortage > 0:
                proc_type = getattr(product, "procurement_type", "Vendor")
                if proc_type in ["Purchase", "Vendor"]:
                    # Check if an auto PO already exists for this sales order to avoid duplication
                    existing_po = db.query(models.PurchaseOrder).filter(
                        models.PurchaseOrder.notes.like(f"%replenishment for Sales Order {so_number}%")
                    ).first()
                    if not existing_po:
                        po_count = db.query(models.PurchaseOrder).count()
                        po_num = f"PO-AUTO-{date.today().year}-{po_count + 1:03d}"
                        cost = getattr(product, "cost_price", product.price) or product.price
                        sub = Decimal(str(cost)) * shortage
                        tax_rate = Decimal('0.05')
                        tax_amt = sub * tax_rate
                        shipping_amt = Decimal('30.00')
                        supplier = product.vendor if product.vendor and product.vendor.strip() else "Auto-Generated Vendor"
                        auto_po = models.PurchaseOrder(
                            po_number=po_num,
                            supplier_name=supplier,
                            order_date=date.today(),
                            status="Draft",
                            subtotal=sub,
                            tax=tax_amt,
                            shipping=shipping_amt,
                            total=sub + tax_amt + shipping_amt,
                            notes=f"Automated MTO replenishment for Sales Order {so_number} shortage of {shortage} units."
                        )
                        po_item = models.PurchaseOrderItem(
                            product_sku=product.sku,
                            quantity=shortage,
                            unit_price=cost,
                            total_price=sub
                        )
                        auto_po.items.append(po_item)
                        db.add(auto_po)
                        log_audit(
                            db=db,
                            user_id=current_user.id,
                            user_name=current_user.name,
                            module="Purchase",
                            record_type="Purchase Order",
                            record_id=po_num,
                            action="Created"
                        )
                elif proc_type in ["Manufacturing", "BOM"]:
                    # Check if an auto MO already exists for this sales order
                    existing_mo = db.query(models.ManufacturingOrder).filter(
                        models.ManufacturingOrder.notes.like(f"%replenishment for Sales Order {so_number}%")
                    ).first()
                    if not existing_mo:
                        mo_count = db.query(models.ManufacturingOrder).count()
                        mo_num = f"MO-AUTO-{date.today().year}-{mo_count + 1:03d}"
                        
                        # Fetch BOM and calculate component requirements scaled by BOM batch size
                        bom = db.query(models.BOM).filter(models.BOM.product_sku == product.sku).first()
                        mo_comps = []
                        if bom:
                            bom_qty = float(bom.quantity) if bom.quantity and bom.quantity > 0 else 1.0
                            for bom_comp in bom.components:
                                req_qty = Decimal(str((float(bom_comp.quantity) / bom_qty) * shortage))
                                mo_comps.append(
                                    models.MOComponent(
                                        component_sku=bom_comp.component_sku,
                                        required_qty=req_qty,
                                        unit=bom.unit or "units",
                                        status="Pending"
                                    )
                                )
                        
                        auto_mo = models.ManufacturingOrder(
                            mo_number=mo_num,
                            product_sku=product.sku,
                            quantity=shortage,
                            start_date=date.today(),
                            status="Draft",
                            notes=f"Automated MTO replenishment for Sales Order {so_number} shortage of {shortage} units."
                        )
                        for comp in mo_comps:
                            auto_mo.components.append(comp)
                        db.add(auto_mo)
                        log_audit(
                            db=db,
                            user_id=current_user.id,
                            user_name=current_user.name,
                            module="Manufacturing",
                            record_type="Manufacturing Order",
                            record_id=mo_num,
                            action="Created"
                        )

router = APIRouter(prefix="/api/sales", tags=["Sales Orders"])

def verify_read(current_user: models.User = Depends(auth.PermissionChecker("sales_order"))):
    return current_user

def verify_write(current_user: models.User = Depends(verify_read)):
    if current_user.role not in ["Admin", "Co-Admin"]:
        raise HTTPException(status_code=403, detail="Write operations are restricted to Admin users.")
    return current_user

@router.get("", response_model=List[schemas.SalesOrderResponse])
def list_sales_orders(db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    return db.query(models.SalesOrder).order_by(models.SalesOrder.order_date.desc()).all()

@router.get("/{so_number}", response_model=schemas.SalesOrderResponse)
def get_sales_order(so_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    so = db.query(models.SalesOrder).filter(models.SalesOrder.so_number == so_number).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")
    return so

@router.post("", response_model=schemas.SalesOrderResponse, status_code=status.HTTP_201_CREATED)
def create_sales_order(so_in: schemas.SalesOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    if so_in.status in ["Confirmed", "Delivered"] and current_user.role not in ["Admin", "Co-Admin"]:
        raise HTTPException(status_code=403, detail="Approving or confirming sales orders is restricted to Admin users.")
    so_number = so_in.so_number
    if not so_number or so_number == "":
        year = date.today().year
        count = db.query(models.SalesOrder).count()
        so_number = f"SO-{year}-{count + 1:03d}"
        while db.query(models.SalesOrder).filter(models.SalesOrder.so_number == so_number).first():
            count += 1
            so_number = f"SO-{year}-{count + 1:03d}"
    else:
        existing = db.query(models.SalesOrder).filter(models.SalesOrder.so_number == so_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="Sales Order Number already exists")

    # Validate items and calculate subtotal
    subtotal = Decimal('0.00')
    items_to_create = []
    
    for item in so_in.items:
        product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_sku} not found")
        
        if so_in.status == "Delivered" and product.stock_level < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

        total_item_price = Decimal(str(item.unit_price)) * item.quantity
        subtotal += total_item_price

        items_to_create.append(
            models.SalesOrderItem(
                product_sku=item.product_sku,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=total_item_price
            )
        )

    # Calculate values
    tax_rate = Decimal(str(so_in.tax))
    shipping_val = Decimal(str(so_in.shipping))
    tax_amt = subtotal * tax_rate
    total_amt = subtotal + tax_amt + shipping_val

    so = models.SalesOrder(
        so_number=so_number,
        customer_name=so_in.customer_name,
        order_date=so_in.order_date,
        status=so_in.status,
        subtotal=subtotal,
        tax=tax_amt,
        shipping=shipping_val,
        total=total_amt,
        notes=so_in.notes
    )

    for item in items_to_create:
        so.items.append(item)
        
        if so_in.status == "Delivered":
            product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
            product.stock_level -= item.quantity

    db.add(so)
    
    # Trigger Make to Order automation if confirmed
    trigger_mto_automation(db, so_in.items, so.so_number, so.status, current_user)
    
    # --- Audit log creation ---
    # Log that the Sales Order has been created under the Sales module context
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Sales",
        record_type="Sales Order",
        record_id=so.so_number,
        action="Created"
    )
    
    db.commit()
    db.refresh(so)
    return so

@router.put("/{so_number}", response_model=schemas.SalesOrderResponse)
def update_sales_order(so_number: str, so_in: schemas.SalesOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    so = db.query(models.SalesOrder).filter(models.SalesOrder.so_number == so_number).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")

    # Non-admin users can only edit Draft orders and cannot confirm or deliver
    if current_user.role not in ["Admin", "Co-Admin"]:
        if so.status != "Draft":
            raise HTTPException(status_code=403, detail="Only Admin users can edit confirmed or delivered orders.")
        if so_in.status not in ["Draft", "Cancelled"]:
            raise HTTPException(status_code=403, detail="Approving or confirming sales orders is restricted to Admin users.")

    old_status = so.status
    old_items = [(item.product_sku, item.quantity) for item in so.items]

    if old_status == "Delivered":
        for old_sku, old_qty in old_items:
            product = db.query(models.Product).filter(models.Product.sku == old_sku).first()
            if product:
                product.stock_level += old_qty

    # Recalculate everything
    subtotal = Decimal('0.00')
    
    # Remove existing items first
    db.query(models.SalesOrderItem).filter(models.SalesOrderItem.so_number == so_number).delete()

    # Re-insert items and apply delivered stock movement from the new lines.
    for item in so_in.items:
        product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_sku} not found")

        if so_in.status == "Delivered" and product.stock_level < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name} to deliver order.")

        total_item_price = Decimal(str(item.unit_price)) * item.quantity
        subtotal += total_item_price

        new_item = models.SalesOrderItem(
            so_number=so_number,
            product_sku=item.product_sku,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=total_item_price
        )
        db.add(new_item)

        # Handle stock updates
        if so_in.status == "Delivered":
            product.stock_level -= item.quantity

    tax_rate = Decimal(str(so_in.tax))
    shipping_val = Decimal(str(so_in.shipping))
    tax_amt = subtotal * tax_rate
    total_amt = subtotal + tax_amt + shipping_val

    # Update SO details
    so.customer_name = so_in.customer_name
    so.order_date = so_in.order_date
    so.status = so_in.status
    so.subtotal = subtotal
    so.tax = tax_amt
    so.shipping = shipping_val
    so.total = total_amt
    so.notes = so_in.notes

    # --- Audit log update ---
    # If the order status has changed, we log a Status change.
    if old_status != so.status:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module="Sales",
            record_type="Sales Order",
            record_id=so.so_number,
            action="Updated",
            field_changed="Status",
            old_value=old_status,
            new_value=so.status
        )
    # Otherwise, if fields other than status were updated, we log general details update
    else:
        log_audit(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name,
            module="Sales",
            record_type="Sales Order",
            record_id=so.so_number,
            action="Updated",
            field_changed="Order Details"
        )

    # Trigger Make to Order automation if confirmed
    trigger_mto_automation(db, so_in.items, so.so_number, so.status, current_user)

    db.commit()
    db.refresh(so)
    return so

@router.delete("/{so_number}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sales_order(so_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(verify_read)):
    so = db.query(models.SalesOrder).filter(models.SalesOrder.so_number == so_number).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")

    if current_user.role not in ["Admin", "Co-Admin"] and so.status != "Draft":
        raise HTTPException(status_code=403, detail="Deleting confirmed or delivered orders is restricted to Admin users.")

    # If it was completed, return the stock
    if so.status == "Delivered":
        for item in so.items:
            product = db.query(models.Product).filter(models.Product.sku == item.product_sku).first()
            if product:
                product.stock_level += item.quantity

    # --- Audit log deletion ---
    # Log that the Sales Order has been deleted under the Sales module context
    log_audit(
        db=db,
        user_id=current_user.id,
        user_name=current_user.name,
        module="Sales",
        record_type="Sales Order",
        record_id=so.so_number,
        action="Deleted"
    )

    db.delete(so)
    db.commit()
    return None

from datetime import date, timedelta
from decimal import Decimal

from . import auth, models


DEMO_PRODUCTS = [
    ("PROD-1001", "Executive Office Desk", "Finished Goods", "UrbanWood Vendors", 18500, 11200, 8, "BOM", True),
    ("PROD-1002", "Modular Bookshelf", "Finished Goods", "UrbanWood Vendors", 12200, 7600, 0, "BOM", True),
    ("PROD-1003", "Ergonomic Work Chair", "Finished Goods", "Comfort Seating Co", 9500, 6100, 14, "Vendor", False),
    ("PROD-1004", "Conference Table", "Finished Goods", "UrbanWood Vendors", 31500, 21000, 2, "BOM", True),
    ("COMP-2001", "Teak Wood Panel", "Raw Materials", "Kaveri Timber Depot", 2400, 1700, 34, "Vendor", False),
    ("COMP-2002", "Steel Bracket Set", "Components", "Metro Hardware", 420, 260, 55, "Vendor", False),
    ("COMP-2003", "Drawer Runner Pair", "Components", "Metro Hardware", 680, 410, 6, "Vendor", False),
    ("COMP-2004", "Laminate Sheet", "Raw Materials", "SurfacePro Supplies", 1150, 760, 21, "Vendor", False),
    ("COMP-2005", "Upholstery Cushion", "Components", "Comfort Seating Co", 980, 620, 0, "Vendor", False),
    ("COMP-2006", "Wood Screw Pack", "Components", "Metro Hardware", 180, 95, 120, "Vendor", False),
]


def seed_demo_data(db):
    admin = db.query(models.User).filter(models.User.username == "admin@example.com").first()
    if not admin:
        admin = models.User(
            name="Admin",
            username="admin@example.com",
            email="admin@example.com",
            password_hash=auth.get_password_hash("admin@26"),
            role="Admin",
            is_approved=True,
        )
        db.add(admin)

    user = db.query(models.User).filter(models.User.username == "user@example.com").first()
    if not user:
        user = models.User(
            name="User",
            username="user@example.com",
            email="user@example.com",
            password_hash=auth.get_password_hash("user@26"),
            role="User",
            is_approved=True,
        )
        db.add(user)

    for sku, name, category, vendor, price, cost, stock, procurement_type, mto in DEMO_PRODUCTS:
        product = db.query(models.Product).filter(models.Product.sku == sku).first()
        if not product:
            db.add(models.Product(
                sku=sku,
                name=name,
                vendor=vendor,
                category=category,
                description=f"Demo catalog item for {name}.",
                price=Decimal(price),
                cost_price=Decimal(cost),
                stock_level=stock,
                reorder_point=10,
                procure_on_demand=mto,
                procurement_type=procurement_type,
            ))

    db.flush()

    if not db.query(models.BOM).filter(models.BOM.reference == "BOM1001").first():
        desk_bom = models.BOM(
            product_sku="PROD-1001",
            name="Executive Office Desk BOM",
            description="Standard desk assembly recipe.",
            quantity=Decimal("6"),
            unit="units",
            reference="BOM1001",
        )
        desk_bom.components = [
            models.BOMComponent(component_sku="COMP-2001", quantity=Decimal("2")),
            models.BOMComponent(component_sku="COMP-2002", quantity=Decimal("1")),
            models.BOMComponent(component_sku="COMP-2003", quantity=Decimal("1")),
            models.BOMComponent(component_sku="COMP-2006", quantity=Decimal("2")),
        ]
        desk_bom.operations = [
            models.BOMOperation(operation_name="Cutting", duration_mins=45, work_center="Wood Shop"),
            models.BOMOperation(operation_name="Assembly", duration_mins=90, work_center="Assembly Bay"),
            models.BOMOperation(operation_name="Finishing", duration_mins=60, work_center="Polish Room"),
        ]
        db.add(desk_bom)

    if not db.query(models.SalesOrder).filter(models.SalesOrder.so_number == "SO-2026-001").first():
        so = models.SalesOrder(
            so_number="SO-2026-001",
            customer_name="Aarav Interiors",
            order_date=date.today() - timedelta(days=3),
            status="Confirmed",
            subtotal=Decimal("37500"),
            tax=Decimal("6750"),
            shipping=Decimal("1200"),
            total=Decimal("45450"),
            notes="Demo confirmed demand; reserves stock until delivery.",
        )
        so.items = [
            models.SalesOrderItem(product_sku="PROD-1001", quantity=1, unit_price=Decimal("18500"), total_price=Decimal("18500")),
            models.SalesOrderItem(product_sku="PROD-1003", quantity=2, unit_price=Decimal("9500"), total_price=Decimal("19000")),
        ]
        db.add(so)

    if not db.query(models.PurchaseOrder).filter(models.PurchaseOrder.po_number == "PO-2026-001").first():
        po = models.PurchaseOrder(
            po_number="PO-2026-001",
            supplier_name="Metro Hardware",
            order_date=date.today() - timedelta(days=2),
            status="Received",
            subtotal=Decimal("5700"),
            tax=Decimal("285"),
            shipping=Decimal("450"),
            total=Decimal("6435"),
            notes="Demo received purchase order.",
        )
        po.items = [
            models.PurchaseOrderItem(product_sku="COMP-2002", quantity=10, unit_price=Decimal("260"), total_price=Decimal("2600")),
            models.PurchaseOrderItem(product_sku="COMP-2006", quantity=20, unit_price=Decimal("95"), total_price=Decimal("1900")),
        ]
        db.add(po)

    if not db.query(models.ManufacturingOrder).filter(models.ManufacturingOrder.mo_number == "MO-2026-001").first():
        mo = models.ManufacturingOrder(
            mo_number="MO-2026-001",
            product_sku="PROD-1001",
            quantity=3,
            start_date=date.today(),
            status="Confirmed",
            notes="Demo manufacturing order with BOM components allocated.",
        )
        mo.components = [
            models.MOComponent(component_sku="COMP-2001", required_qty=Decimal("6"), unit="units", status="Allocated"),
            models.MOComponent(component_sku="COMP-2002", required_qty=Decimal("3"), unit="sets", status="Allocated"),
            models.MOComponent(component_sku="COMP-2006", required_qty=Decimal("6"), unit="packs", status="Allocated"),
        ]
        db.add(mo)

    db.commit()

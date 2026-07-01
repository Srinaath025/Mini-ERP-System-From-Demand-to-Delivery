import os
import sys
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

# Append the current directory to sys.path to import modules correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import (
    Base, User, Product, BOM, BOMComponent, BOMOperation,
    SalesOrder, SalesOrderItem, PurchaseOrder, PurchaseOrderItem,
    ManufacturingOrder, MOComponent
)
from app.auth import get_password_hash

def seed_database():
    db = SessionLocal()
    try:
        print("Clearing existing records...")
        # Clear existing tables (avoiding user logins 'admin' and 'user')
        db.query(SalesOrderItem).delete()
        db.query(SalesOrder).delete()
        db.query(PurchaseOrderItem).delete()
        db.query(PurchaseOrder).delete()
        db.query(MOComponent).delete()
        db.query(ManufacturingOrder).delete()
        db.query(BOMComponent).delete()
        db.query(BOMOperation).delete()
        db.query(BOM).delete()
        db.query(Product).delete()
        # Clear existing users completely so we recreate them
        db.query(User).delete()
        db.flush()
        print("Records cleared successfully.")

        # 1. Seed default users, 20 standard users, and 3 admins
        print("Seeding users and admins...")
        
        # Default Admin and User
        default_users = [
            ("Admin", "admin@example.com", "Admin"),
            ("User", "user@example.com", "User")
        ]
        for name, email, role in default_users:
            pwd = f"{name.lower().replace(' ', '')}@26"
            pwd_hash = get_password_hash(pwd)
            u = User(
                name=name,
                username=email,
                email=email,
                password_hash=pwd_hash,
                role=role,
                is_approved=True,
                position="System Default",
                created_at=datetime.utcnow() - timedelta(days=200)
            )
            db.add(u)
        
        # 20 Users with real names
        real_users = [
            "Amit Sharma", "Priya Patel", "Rajesh Kumar", "Sunita Rao", "Vikram Singh",
            "Anjali Gupta", "Sanjay Mehta", "Deepika Sen", "Arjun Reddy", "Kavita Nair",
            "Rohan Joshi", "Pooja Hegde", "Manish Tiwari", "Sneha Kulkarni", "Harish Iyer",
            "Divya Pillai", "Sandeep Deshmukh", "Neha Sharma", "Vijay Prasad", "Ritu Chaudhary"
        ]

        for i, name in enumerate(real_users, 1):
            email = f"{name.lower().replace(' ', '')}@example.com"
            pwd = f"{name.lower().replace(' ', '')}@26"
            pwd_hash = get_password_hash(pwd)
            user = User(
                name=name,
                username=email,
                email=email,
                password_hash=pwd_hash,
                role="User",
                is_approved=True,
                phone=f"+91 98765 432{i:02d}",
                address=f"Flat {i * 10}, Tech Park Colony, Bangalore",
                position="Inventory Assistant",
                created_at=datetime.utcnow() - timedelta(days=random.randint(10, 100))
            )
            db.add(user)

        # 3 Admins with real names
        real_admins = [
            "Rahul Dravid", "Sourav Ganguly", "Sachin Tendulkar"
        ]

        for i, name in enumerate(real_admins, 1):
            email = f"{name.lower().replace(' ', '')}@example.com"
            pwd = f"{name.lower().replace(' ', '')}@26"
            pwd_hash = get_password_hash(pwd)
            admin = User(
                name=name,
                username=email,
                email=email,
                password_hash=pwd_hash,
                role="Admin",
                is_approved=True,
                phone=f"+91 99999 888{i:02d}",
                address=f"Penthouse {i}, Tech Park Colony, Bangalore",
                position="ERP Admin",
                created_at=datetime.utcnow() - timedelta(days=random.randint(50, 150))
            )
            db.add(admin)
        db.flush()
        print("Users and admins seeded successfully.")

        # 2. Seed exactly 45 Products
        print("Seeding 45 products...")
        categories = ['Electronics', 'Finished Goods', 'Components', 'Raw Materials']
        vendors = ['Intel Microelectronics', 'TSMC Fabrication', 'Murata Electronics', 'Metals & Alloys India', 'Mega Hardware']
        
        products = []
        for i in range(1, 46):
            sku = f"PROD-{i:03d}"
            price = Decimal(f"{random.randint(10, 50) * 100}.00")
            cost_price = Decimal(f"{float(price) * random.uniform(0.5, 0.8):.2f}")
            p = Product(
                sku=sku,
                name=f"Enterprise Product {i:02d}",
                vendor=random.choice(vendors),
                category=random.choice(categories),
                description=f"Automated seed product specification for SKU {sku}",
                price=price,
                cost_price=cost_price,
                stock_level=random.randint(50, 500),
                reorder_point=10,
                procure_on_demand=False,
                procurement_type="BOM" if i <= 35 else "Vendor"
            )
            db.add(p)
            products.append(p)
        db.flush()
        print("Products seeded successfully.")

        # 3. Seed exactly 45 Bills of Materials (BOM)
        print("Seeding 45 BOM configurations...")
        for i in range(1, 46):
            sku = f"PROD-{i:03d}"
            bom = BOM(
                product_sku=sku,
                name=f"Standard Recipe for {sku}",
                description=f"Standard assembly recipe for product specification {sku}",
                quantity=Decimal("1.00"),
                unit="units",
                reference=f"BOM-{i:03d}"
            )
            db.add(bom)
            db.flush()

            # Add BOM Components
            if i <= 40:
                # Use next products as components
                comp1 = BOMComponent(
                    bom_id=bom.id,
                    component_sku=f"PROD-{i+1:03d}",
                    quantity=Decimal("2.00")
                )
                comp2 = BOMComponent(
                    bom_id=bom.id,
                    component_sku=f"PROD-{i+2:03d}",
                    quantity=Decimal("3.00")
                )
                db.add(comp1)
                db.add(comp2)
            else:
                # Use PROD-001 as component to avoid index out of bounds
                comp1 = BOMComponent(
                    bom_id=bom.id,
                    component_sku="PROD-001",
                    quantity=Decimal("5.00")
                )
                db.add(comp1)

            # Add BOM Operation
            op = BOMOperation(
                bom_id=bom.id,
                operation_name="Quality Assurance & Packing",
                duration_mins=random.choice([15, 30, 45, 60]),
                work_center="Factory Workcenter Alpha"
            )
            db.add(op)
        db.flush()
        print("BOM configurations seeded successfully.")

        # 4. Seed exactly 45 Sales Orders
        print("Seeding 45 sales orders...")
        statuses = ["Draft", "Confirmed", "Delivered"]
        customers = ["Alpha Electronics Corp", "Beta Tech Solutions", "Gamma Mfg Ltd", "Delta Logistics", "Omega System Integrators"]
        
        for i in range(1, 46):
            so_number = f"SO-{date.today().year}-{i:03d}"
            order_date = date.today() - timedelta(days=random.randint(1, 30))
            status = random.choice(statuses)
            
            # Select random products
            order_items_data = random.sample(products, random.randint(1, 3))
            subtotal = Decimal("0.00")
            
            items_to_add = []
            for p in order_items_data:
                qty = random.randint(1, 5)
                tot = p.price * qty
                subtotal += tot
                items_to_add.append((p.sku, qty, p.price, tot))
                
            tax_rate = Decimal("0.08")
            tax = subtotal * tax_rate
            shipping = Decimal("15.00")
            total = subtotal + tax + shipping
            
            so = SalesOrder(
                so_number=so_number,
                customer_name=random.choice(customers),
                order_date=order_date,
                status=status,
                subtotal=subtotal,
                tax=tax,
                shipping=shipping,
                total=total,
                notes=f"Seeded sales transaction log {so_number}."
            )
            db.add(so)
            db.flush()
            
            for sku, qty, price, tot in items_to_add:
                item = SalesOrderItem(
                    so_number=so_number,
                    product_sku=sku,
                    quantity=qty,
                    unit_price=price,
                    total_price=tot
                )
                db.add(item)
        db.flush()
        print("Sales orders seeded successfully.")

        # 5. Seed exactly 45 Purchase Orders
        print("Seeding 45 purchase orders...")
        po_statuses = ["Draft", "Confirmed", "Received"]
        suppliers = ["Mega Semiconductor Co.", "Giga Materials Ltd", "Tera Components Inc", "Peta Hardware Depot"]
        
        for i in range(1, 46):
            po_number = f"PO-{date.today().year}-{i:03d}"
            order_date = date.today() - timedelta(days=random.randint(1, 30))
            status = random.choice(po_statuses)
            
            order_items_data = random.sample(products, random.randint(1, 2))
            subtotal = Decimal("0.00")
            
            items_to_add = []
            for p in order_items_data:
                qty = random.randint(10, 50)
                tot = p.cost_price * qty
                subtotal += tot
                items_to_add.append((p.sku, qty, p.cost_price, tot))
                
            tax_rate = Decimal("0.05")
            tax = subtotal * tax_rate
            shipping = Decimal("30.00")
            total = subtotal + tax + shipping
            
            po = PurchaseOrder(
                po_number=po_number,
                supplier_name=random.choice(suppliers),
                order_date=order_date,
                status=status,
                subtotal=subtotal,
                tax=tax,
                shipping=shipping,
                total=total,
                notes=f"Seeded procurement transaction log {po_number}."
            )
            db.add(po)
            db.flush()
            
            for sku, qty, price, tot in items_to_add:
                item = PurchaseOrderItem(
                    po_number=po_number,
                    product_sku=sku,
                    quantity=qty,
                    unit_price=price,
                    total_price=tot
                )
                db.add(item)
        db.flush()
        print("Purchase orders seeded successfully.")

        # 6. Seed exactly 45 Manufacturing Orders
        print("Seeding 45 manufacturing orders...")
        mo_statuses = ["Draft", "Confirmed", "Completed"]
        
        for i in range(1, 46):
            mo_number = f"MO-{date.today().year}-{i:03d}"
            start_date = date.today() - timedelta(days=random.randint(1, 30))
            status = random.choice(mo_statuses)
            target_product = products[i - 1] # Ensure we rotate through products cleanly
            qty = random.randint(5, 50)
            
            mo = ManufacturingOrder(
                mo_number=mo_number,
                product_sku=target_product.sku,
                quantity=qty,
                start_date=start_date,
                end_date=start_date + timedelta(days=1) if status == "Completed" else None,
                status=status,
                notes=f"Seeded assembly manufacturing run order {mo_number}."
            )
            db.add(mo)
            db.flush()

            # Add manufacturing order components by fetching the target product's BOM
            bom = db.query(BOM).filter(BOM.product_sku == target_product.sku).first()
            if bom:
                for bom_comp in bom.components:
                    mo_comp = MOComponent(
                        mo_number=mo_number,
                        component_sku=bom_comp.component_sku,
                        required_qty=bom_comp.quantity * qty,
                        unit="units",
                        status="Issued" if status == "Completed" else ("Allocated" if status == "Confirmed" else "Pending")
                    )
                    db.add(mo_comp)
        db.commit()
        print("Manufacturing orders seeded successfully.")

        print("\nAll database tables successfully seeded!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

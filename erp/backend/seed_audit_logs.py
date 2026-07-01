import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import Session

# Append the directory of this file to system path so we can import the database and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import AuditLog
from app.database import engine

def seed_audit_logs(db: Session):
    # Step 1: Remove all existing log data to start fresh
    print("Clearing existing audit logs...")
    db.query(AuditLog).delete()
    db.commit()

    print("Generating 1265 audit logs...")

    # Step 2: Define the 9 specific logs from the user screenshot.
    # These will be set to May 26, 2026, so they show as the most recent logs.
    mockup_logs = [
        {
            "timestamp": datetime(2026, 5, 26, 11, 42, 0),
            "user_name": "Amit Sharma",
            "module": "Sales",
            "record_type": "Product",
            "record_id": "PROD-0034",
            "action": "Updated",
            "field_changed": "Sales Price",
            "old_value": "₹120.00",
            "new_value": "₹135.00"
        },
        {
            "timestamp": datetime(2026, 5, 26, 11, 15, 0),
            "user_name": "Neha Verma",
            "module": "Sales",
            "record_type": "Item",
            "record_id": "ITEM-0102",
            "action": "Updated",
            "field_changed": "Cost Price",
            "old_value": "₹80.00",
            "new_value": "₹85.00"
        },
        {
            "timestamp": datetime(2026, 5, 26, 10, 55, 0),
            "user_name": "Ravi Patel",
            "module": "Purchase",
            "record_type": "Purchase Order",
            "record_id": "PO-2026-087",
            "action": "Created",
            "field_changed": "-",
            "old_value": "-",
            "new_value": "-"
        },
        {
            "timestamp": datetime(2026, 5, 26, 10, 20, 0),
            "user_name": "Amit Sharma",
            "module": "Purchase",
            "record_type": "Item",
            "record_id": "ITEM-0456",
            "action": "Updated",
            "field_changed": "Cost Price",
            "old_value": "₹45.00",
            "new_value": "₹50.00"
        },
        {
            "timestamp": datetime(2026, 5, 26, 9, 48, 0),
            "user_name": "Meera Singh",
            "module": "Manufacturing",
            "record_type": "BOM",
            "record_id": "BOM-2026-015",
            "action": "Created",
            "field_changed": "-",
            "old_value": "-",
            "new_value": "-"
        },
        {
            "timestamp": datetime(2026, 5, 26, 9, 30, 0),
            "user_name": "Ravi Patel",
            "module": "Sales",
            "record_type": "Item",
            "record_id": "ITEM-0102",
            "action": "Updated",
            "field_changed": "Sales Price",
            "old_value": "₹110.00",
            "new_value": "₹120.00"
        },
        {
            "timestamp": datetime(2026, 5, 26, 9, 10, 0),
            "user_name": "Neha Verma",
            "module": "Purchase",
            "record_type": "Product",
            "record_id": "PROD-0021",
            "action": "Deleted",
            "field_changed": "-",
            "old_value": "-",
            "new_value": "-"
        },
        {
            "timestamp": datetime(2026, 5, 26, 8, 45, 0),
            "user_name": "Amit Sharma",
            "module": "Manufacturing",
            "record_type": "Manufacturing Order",
            "record_id": "MO-2026-022",
            "action": "Updated",
            "field_changed": "Demand",
            "old_value": "80",
            "new_value": "100"
        },
        {
            "timestamp": datetime(2026, 5, 26, 8, 30, 0),
            "user_name": "Meera Singh",
            "module": "Manufacturing",
            "record_type": "Material Consumption",
            "record_id": "MC-2026-055",
            "action": "Updated",
            "field_changed": "Consumed Qty",
            "old_value": "45",
            "new_value": "50"
        }
    ]

    # Helper lists for random generation
    users = ["Amit Sharma", "Neha Verma", "Ravi Patel", "Meera Singh", "tara1234", "poiuyt"]
    modules = {
        "Sales": ["Product", "Item", "Sales Order"],
        "Purchase": ["Product", "Item", "Purchase Order"],
        "Manufacturing": ["Manufacturing Order", "BOM", "Material Consumption"]
    }

    # Temporary arrays to hold generated logs
    created_pool = []
    updated_pool = []
    deleted_pool = []

    # Logs will be randomly scattered from May 1 to May 25, 2026
    start_date = datetime(2026, 5, 1)
    end_date = datetime(2026, 5, 25, 23, 59, 59)
    total_seconds = int((end_date - start_date).total_seconds())

    def get_random_timestamp():
        return start_date + timedelta(seconds=random.randint(0, total_seconds))

    # Step 3: Generate remaining 354 Created logs
    for _ in range(354):
        mod = random.choice(list(modules.keys()))
        rec_type = random.choice(modules[mod])
        rec_id = f"{rec_type[0:4].upper()}-{random.randint(1000, 9999)}" if "Order" not in rec_type else f"{'SO' if 'Sales' in rec_type else 'PO' if 'Purchase' in rec_type else 'MO'}-2026-{random.randint(100, 999)}"
        if rec_type == "BOM":
            rec_id = f"BOM-2026-{random.randint(100, 999)}"
        elif rec_type == "Material Consumption":
            rec_id = f"MC-2026-{random.randint(100, 999)}"
            
        created_pool.append({
            "timestamp": get_random_timestamp(),
            "user_name": random.choice(users),
            "module": mod,
            "record_type": rec_type,
            "record_id": rec_id,
            "action": "Created",
            "field_changed": "-",
            "old_value": "-",
            "new_value": "-"
        })

    # Step 4: Generate remaining 783 Updated logs
    for _ in range(783):
        mod = random.choice(list(modules.keys()))
        rec_type = random.choice(modules[mod])
        rec_id = f"{rec_type[0:4].upper()}-{random.randint(1000, 9999)}" if "Order" not in rec_type else f"{'SO' if 'Sales' in rec_type else 'PO' if 'Purchase' in rec_type else 'MO'}-2026-{random.randint(100, 999)}"
        if rec_type == "BOM":
            rec_id = f"BOM-2026-{random.randint(100, 999)}"
        elif rec_type == "Material Consumption":
            rec_id = f"MC-2026-{random.randint(100, 999)}"

        # Set realistic field updates and old/new values based on type
        field_changed = "Status"
        old_val, new_val = "Pending", "Completed"
        if rec_type in ["Product", "Item"]:
            field_changed = random.choice(["Sales Price", "Cost Price", "Stock Level"])
            if "Price" in field_changed:
                v1, v2 = random.randint(10, 200), random.randint(10, 200)
                old_val, new_val = f"₹{v1:.2f}", f"₹{v2:.2f}"
            else:
                old_val, new_val = str(random.randint(0, 100)), str(random.randint(0, 100))
        elif rec_type == "Material Consumption":
            field_changed = "Consumed Qty"
            v = random.randint(10, 100)
            old_val, new_val = str(v), str(v + random.randint(1, 10))

        updated_pool.append({
            "timestamp": get_random_timestamp(),
            "user_name": random.choice(users),
            "module": mod,
            "record_type": rec_type,
            "record_id": rec_id,
            "action": "Updated",
            "field_changed": field_changed,
            "old_value": old_val,
            "new_value": new_val
        })

    # Step 5: Generate remaining 119 Deleted logs
    for _ in range(119):
        mod = random.choice(list(modules.keys()))
        rec_type = random.choice(modules[mod])
        rec_id = f"{rec_type[0:4].upper()}-{random.randint(1000, 9999)}" if "Order" not in rec_type else f"{'SO' if 'Sales' in rec_type else 'PO' if 'Purchase' in rec_type else 'MO'}-2026-{random.randint(100, 999)}"
        if rec_type == "BOM":
            rec_id = f"BOM-2026-{random.randint(100, 999)}"
        elif rec_type == "Material Consumption":
            rec_id = f"MC-2026-{random.randint(100, 999)}"

        deleted_pool.append({
            "timestamp": get_random_timestamp(),
            "user_name": random.choice(users),
            "module": mod,
            "record_type": rec_type,
            "record_id": rec_id,
            "action": "Deleted",
            "field_changed": "-",
            "old_value": "-",
            "new_value": "-"
        })

    # Step 6: Sort both list segments.
    mockup_logs_sorted = sorted(mockup_logs, key=lambda x: x["timestamp"], reverse=True)
    pool_logs_sorted = sorted(created_pool + updated_pool + deleted_pool, key=lambda x: x["timestamp"], reverse=True)

    # Combine the lists together
    final_logs = mockup_logs_sorted + pool_logs_sorted

    # Step 7: Perform bulk insert of all 1265 logs
    db.add_all([AuditLog(**log) for log in final_logs])
    db.commit()

    print(f"Successfully seeded {len(final_logs)} logs!")

    # Step 8: Verify database totals match targets
    total = db.query(AuditLog).count()
    created = db.query(AuditLog).filter(AuditLog.action == "Created").count()
    updated = db.query(AuditLog).filter(AuditLog.action == "Updated").count()
    deleted = db.query(AuditLog).filter(AuditLog.action == "Deleted").count()
    print(f"Counts - Total: {total}, Created: {created}, Updated: {updated}, Deleted: {deleted}")

if __name__ == "__main__":
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        seed_audit_logs(db)
    finally:
        db.close()

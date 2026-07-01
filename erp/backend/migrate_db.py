import os
from sqlalchemy import create_engine, inspect, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:root@localhost:5432/erp_db")
print(f"Connecting to database with URL: {DATABASE_URL}")

# SQLite check
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Inspect columns of products
inspector = inspect(engine)
columns = [col['name'] for col in inspector.get_columns('products')]

with engine.begin() as conn:
    # 1. Add cost_price
    if 'cost_price' not in columns:
        print("Adding 'cost_price' column to 'products' table...")
        conn.execute(text("ALTER TABLE products ADD COLUMN cost_price NUMERIC(10, 2) DEFAULT 0.00"))
            
    # 2. Add procure_on_demand
    if 'procure_on_demand' not in columns:
        print("Adding 'procure_on_demand' column to 'products' table...")
        if DATABASE_URL.startswith("sqlite"):
            conn.execute(text("ALTER TABLE products ADD COLUMN procure_on_demand BOOLEAN DEFAULT 0"))
        else:
            conn.execute(text("ALTER TABLE products ADD COLUMN procure_on_demand BOOLEAN DEFAULT FALSE"))

    # 3. Add procurement_type
    if 'procurement_type' not in columns:
        print("Adding 'procurement_type' column to 'products' table...")
        conn.execute(text("ALTER TABLE products ADD COLUMN procurement_type VARCHAR(50) DEFAULT 'Vendor'"))

    if 'vendor' not in columns:
        print("Adding 'vendor' column to 'products' table...")
        conn.execute(text("ALTER TABLE products ADD COLUMN vendor VARCHAR(100)"))

# Also, use SQLAlchemy's Base.metadata.create_all(bind=engine) to automatically create any missing tables (boms, bom_components, bom_operations, audit_logs)
from app.models import Base
print("Ensuring all missing tables (boms, bom_components, bom_operations, audit_logs) are created...")
Base.metadata.create_all(bind=engine)

# In case the table boms already existed but lacks quantity, unit, reference columns:
bom_cols = [col['name'] for col in inspector.get_columns('boms')] if 'boms' in inspector.get_table_names() else []
with engine.begin() as conn:
    if 'quantity' not in bom_cols and 'boms' in inspector.get_table_names():
        print("Adding 'quantity' column to 'boms'...")
        conn.execute(text("ALTER TABLE boms ADD COLUMN quantity NUMERIC(10, 2) DEFAULT 1.00"))
    if 'unit' not in bom_cols and 'boms' in inspector.get_table_names():
        print("Adding 'unit' column to 'boms'...")
        conn.execute(text("ALTER TABLE boms ADD COLUMN unit VARCHAR(50) DEFAULT 'units'"))
    if 'reference' not in bom_cols and 'boms' in inspector.get_table_names():
        print("Adding 'reference' column to 'boms'...")
        conn.execute(text("ALTER TABLE boms ADD COLUMN reference VARCHAR(8)"))

print("Database migration completed successfully!")

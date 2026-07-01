from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .database import engine, Base
from . import models
from .seed_demo import seed_demo_data
from .routers import auth, users, products, sales, purchase, manufacturing, dashboard, audit_logs, bom, chat

# Create DB tables
Base.metadata.create_all(bind=engine)

def ensure_runtime_columns():
    inspector = inspect(engine)
    if "products" not in inspector.get_table_names():
        return
    product_cols = {col["name"] for col in inspector.get_columns("products")}
    with engine.begin() as conn:
        if "vendor" not in product_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN vendor VARCHAR(100)"))
        if "procure_on_demand" not in product_cols:
            default = "0" if engine.dialect.name == "sqlite" else "FALSE"
            conn.execute(text(f"ALTER TABLE products ADD COLUMN procure_on_demand BOOLEAN DEFAULT {default}"))
        if "procurement_type" not in product_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN procurement_type VARCHAR(50) DEFAULT 'Vendor'"))
        if "cost_price" not in product_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN cost_price NUMERIC(10, 2) DEFAULT 0.00"))
        if "procurement_strategy" not in product_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN procurement_strategy VARCHAR(50) DEFAULT 'MTS'"))

ensure_runtime_columns()

app = FastAPI(
    title="ERP System API",
    description="Backend API for managing products, sales orders, purchase orders, manufacturing, and users.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(purchase.router)
app.include_router(manufacturing.router)
app.include_router(dashboard.router)
app.include_router(audit_logs.router)
app.include_router(bom.router)
app.include_router(chat.router)


# Seed default role permissions on startup
@app.on_event("startup")
def seed_permissions():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        # Check if permissions exist
        # Clean up legacy roles and ensure only Admin and User exist
        db.query(models.RolePermission).filter(models.RolePermission.role.notin_(["Admin", "User"])).delete(synchronize_session=False)
        
        # Seed or update Admin role permissions (access to everything)
        admin_perm = db.query(models.RolePermission).filter(models.RolePermission.role == "Admin").first()
        if not admin_perm:
            admin_perm = models.RolePermission(role="Admin")
            db.add(admin_perm)
        admin_perm.admin_panel = True
        admin_perm.sales_order = True
        admin_perm.purchase_order = True
        admin_perm.manufacturing_order = True
        admin_perm.products = True
        admin_perm.accounts = True
        admin_perm.settings = True

        # Seed or update User role permissions (access to all modules except Admin Panel / settings)
        user_perm = db.query(models.RolePermission).filter(models.RolePermission.role == "User").first()
        if not user_perm:
            user_perm = models.RolePermission(role="User")
            db.add(user_perm)
        user_perm.admin_panel = False
        user_perm.sales_order = True
        user_perm.purchase_order = True
        user_perm.manufacturing_order = True
        user_perm.products = True
        user_perm.accounts = True
        user_perm.settings = False
        
        db.commit()
        print("Successfully synchronized role permissions (Admin and User only).")
        seed_demo_data(db)
        print("Successfully synchronized demo data.")

        # Seed audit logs if empty
        if db.query(models.AuditLog).count() == 0:
            print("Audit log table is empty. Seeding audit logs...")
            import sys
            import os
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.append(parent_dir)
            from seed_audit_logs import seed_audit_logs
            seed_audit_logs(db)
    except Exception as e:
        print(f"Error seeding role permissions: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the ERP Backend API", "docs": "/docs"}

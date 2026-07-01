from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    # Default role set to 'User'
    role = Column(String(50), nullable=False, default="User")
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    phone = Column(String(30), nullable=True)
    address = Column(String(255), nullable=True)
    position = Column(String(100), nullable=True)
    # Changed to Text to support large base64 profile pictures
    photo_url = Column(Text, nullable=True)

    # Relationship to permission setup (role-based)
    permissions = relationship("RolePermission", primaryjoin="User.role == RolePermission.role", foreign_keys=[role], uselist=False)

class RolePermission(Base):
    __tablename__ = "role_permissions"

    role = Column(String(50), primary_key=True)
    admin_panel = Column(Boolean, default=False)
    sales_order = Column(Boolean, default=False)
    purchase_order = Column(Boolean, default=False)
    manufacturing_order = Column(Boolean, default=False)
    products = Column(Boolean, default=False)
    accounts = Column(Boolean, default=False)
    settings = Column(Boolean, default=False)

class Product(Base):
    __tablename__ = "products"

    sku = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    vendor = Column(String(100))
    category = Column(String(100))
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2), default=0.00)
    stock_level = Column(Integer, default=0)
    # Note: reorder_point defaults to 10. supplier has been removed per instructions.
    reorder_point = Column(Integer, default=10)
    procure_on_demand = Column(Boolean, default=False)
    procurement_type = Column(String(50), default="Vendor")
    procurement_strategy = Column(String(50), default="MTS")

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    so_number = Column(String(50), primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    order_date = Column(Date, nullable=False)
    status = Column(String(50), default="Draft") # Draft, Completed, Cancelled
    subtotal = Column(Numeric(10, 2), default=0.00)
    tax = Column(Numeric(10, 2), default=0.00)
    shipping = Column(Numeric(10, 2), default=0.00)
    total = Column(Numeric(10, 2), default=0.00)
    notes = Column(Text)

    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    so_number = Column(String(50), ForeignKey("sales_orders.so_number"), nullable=False)
    product_sku = Column(String(50), ForeignKey("products.sku"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)

    sales_order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    po_number = Column(String(50), primary_key=True, index=True)
    supplier_name = Column(String(100), nullable=False)
    order_date = Column(Date, nullable=False)
    status = Column(String(50), default="Draft") # Draft, Completed, Cancelled
    subtotal = Column(Numeric(10, 2), default=0.00)
    tax = Column(Numeric(10, 2), default=0.00)
    shipping = Column(Numeric(10, 2), default=0.00)
    total = Column(Numeric(10, 2), default=0.00)
    notes = Column(Text)

    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), ForeignKey("purchase_orders.po_number"), nullable=False)
    product_sku = Column(String(50), ForeignKey("products.sku"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")

class ManufacturingOrder(Base):
    __tablename__ = "manufacturing_orders"

    mo_number = Column(String(50), primary_key=True, index=True)
    product_sku = Column(String(50), ForeignKey("products.sku"), nullable=False)
    quantity = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(String(50), default="Draft") # Draft, Completed, Cancelled
    notes = Column(Text)

    product = relationship("Product")
    components = relationship("MOComponent", back_populates="manufacturing_order", cascade="all, delete-orphan")

class MOComponent(Base):
    __tablename__ = "mo_components"

    id = Column(Integer, primary_key=True, index=True)
    mo_number = Column(String(50), ForeignKey("manufacturing_orders.mo_number"), nullable=False)
    component_sku = Column(String(50), ForeignKey("products.sku"), nullable=False)
    required_qty = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(50), default="units") # units, kg, liters, etc.
    status = Column(String(50), default="Pending") # Pending, Allocated, Issued

    manufacturing_order = relationship("ManufacturingOrder", back_populates="components")
    component = relationship("Product")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(100), nullable=True)
    module = Column(String(100), nullable=False) # e.g., Sales, Purchase, Manufacturing
    record_type = Column(String(100), nullable=False) # e.g., Product, Purchase Order
    record_id = Column(String(100), nullable=False, index=True)
    action = Column(String(50), nullable=False) # Created, Updated, Deleted
    field_changed = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)

class BOM(Base):
    __tablename__ = "boms"

    id = Column(Integer, primary_key=True, index=True)
    product_sku = Column(String(50), ForeignKey("products.sku"), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    quantity = Column(Numeric(10, 2), default=1.00)
    unit = Column(String(50), default="units")
    reference = Column(String(8), nullable=True)

    product = relationship("Product")
    components = relationship("BOMComponent", back_populates="bom", cascade="all, delete-orphan")
    operations = relationship("BOMOperation", back_populates="bom", cascade="all, delete-orphan")

class BOMComponent(Base):
    __tablename__ = "bom_components"

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("boms.id"), nullable=False)
    component_sku = Column(String(50), ForeignKey("products.sku"), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)

    bom = relationship("BOM", back_populates="components")
    component = relationship("Product")

class BOMOperation(Base):
    __tablename__ = "bom_operations"

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("boms.id"), nullable=False)
    operation_name = Column(String(100), nullable=False)
    duration_mins = Column(Integer, nullable=False)
    work_center = Column(String(100))

    bom = relationship("BOM", back_populates="operations")

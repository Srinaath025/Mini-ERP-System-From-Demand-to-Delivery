from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

# --- Role Permissions ---
class RolePermissionBase(BaseModel):
    role: str
    admin_panel: bool = False
    sales_order: bool = False
    purchase_order: bool = False
    manufacturing_order: bool = False
    products: bool = False
    accounts: bool = False
    settings: bool = False

class RolePermissionResponse(RolePermissionBase):
    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    username: str
    email: EmailStr
    # Default role restricted to 'User'
    role: str = "User"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_approved: bool
    created_at: datetime
    phone: Optional[str] = None
    address: Optional[str] = None
    position: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdateRole(BaseModel):
    role: str

class UserApproval(BaseModel):
    is_approved: bool

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    position: Optional[str] = None
    photo_url: Optional[str] = None

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# --- Product Schemas ---
class ProductBase(BaseModel):
    sku: str
    name: str
    vendor: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Decimal
    cost_price: Decimal = Decimal('0.00')
    stock_level: int = 0
    reorder_point: int = 10
    procure_on_demand: bool = False
    procurement_type: Optional[str] = None
    procurement_strategy: str = "MTS"
    bom_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    reserved_qty: int = 0
    free_to_use_qty: int = 0
    bom_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Sales Order Schemas ---
class SalesOrderItemBase(BaseModel):
    product_sku: str
    quantity: int
    unit_price: Decimal

class SalesOrderItemCreate(SalesOrderItemBase):
    pass

class SalesOrderItemResponse(SalesOrderItemBase):
    id: int
    so_number: str
    total_price: Decimal

    class Config:
        from_attributes = True

class SalesOrderBase(BaseModel):
    so_number: Optional[str] = None
    customer_name: str
    order_date: date
    status: str = "Draft"
    subtotal: Decimal = Decimal('0.00')
    tax: Decimal = Decimal('0.00')
    shipping: Decimal = Decimal('0.00')
    total: Decimal = Decimal('0.00')
    notes: Optional[str] = None

class SalesOrderCreate(SalesOrderBase):
    items: List[SalesOrderItemCreate]

class SalesOrderResponse(SalesOrderBase):
    items: List[SalesOrderItemResponse]

    class Config:
        from_attributes = True

# --- Purchase Order Schemas ---
class PurchaseOrderItemBase(BaseModel):
    product_sku: str
    quantity: int
    unit_price: Decimal

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    po_number: str
    total_price: Decimal

    class Config:
        from_attributes = True

class PurchaseOrderBase(BaseModel):
    po_number: Optional[str] = None
    supplier_name: str
    order_date: date
    status: str = "Draft"
    subtotal: Decimal = Decimal('0.00')
    tax: Decimal = Decimal('0.00')
    shipping: Decimal = Decimal('0.00')
    total: Decimal = Decimal('0.00')
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderResponse(PurchaseOrderBase):
    items: List[PurchaseOrderItemResponse]

    class Config:
        from_attributes = True

# --- Manufacturing Order Schemas ---
class MOComponentBase(BaseModel):
    component_sku: str
    required_qty: Decimal
    unit: str = "units"
    status: str = "Pending"

class MOComponentCreate(MOComponentBase):
    pass

class MOComponentResponse(MOComponentBase):
    id: int
    mo_number: str

    class Config:
        from_attributes = True

class ManufacturingOrderBase(BaseModel):
    mo_number: Optional[str] = None
    product_sku: str
    quantity: int
    start_date: date
    end_date: Optional[date] = None
    status: str = "Draft"
    notes: Optional[str] = None

class ManufacturingOrderCreate(ManufacturingOrderBase):
    components: List[MOComponentCreate]

class ManufacturingOrderResponse(ManufacturingOrderBase):
    components: List[MOComponentResponse]

    class Config:
        from_attributes = True

# --- Audit Log Schemas ---

# This schema defines the structure for a single audit log entry returned to the user.
# It represents a record of a change, including who did it, where, when, and what changed.
class AuditLogResponse(BaseModel):
    id: int                              # Unique database ID of the audit log
    timestamp: datetime                  # Date and time when the change occurred
    user_id: Optional[int] = None        # ID of the user who made the change
    user_name: Optional[str] = None      # Username of the person who made the change
    module: str                          # ERP module where it happened (Sales, Purchase, etc.)
    record_type: str                     # Type of entity modified (Product, Sales Order, etc.)
    record_id: str                       # Unique identifier of the entity (like PROD-0034)
    action: str                          # Action type (Created, Updated, Deleted)
    field_changed: Optional[str] = None  # Specific field that changed (like Sales Price)
    old_value: Optional[str] = None      # The value before the update
    new_value: Optional[str] = None      # The new value after the update

    # Enables Pydantic to read data directly from SQLAlchemy database models
    class Config:
        from_attributes = True

# This schema defines the structure for a paginated list of audit logs.
# It includes the list of logs along with paging details (total count, pages, limits).
class AuditLogPaginatedResponse(BaseModel):
    logs: List[AuditLogResponse]         # List of logs for the requested page
    total_count: int                     # Total number of logs matching current filters
    page: int                            # Current page number (starts at 1)
    limit: int                           # Number of logs per page
    total_pages: int                     # Total pages available

# This schema defines the structure for the summary cards on top of the dashboard.
# It returns the total logs, and the subset counts of Created, Updated, and Deleted actions.
class AuditLogStatsResponse(BaseModel):
    total: int                           # Total logs of all time
    created: int                         # Total logs with 'Created' action
    updated: int                         # Total logs with 'Updated' action
    deleted: int                         # Total logs with 'Deleted' action

# This schema defines the structure for the dropdown filter options.
# It returns a list of unique users, modules, and actions so the frontend can populate filters.
class AuditLogFiltersResponse(BaseModel):
    users: List[str]                     # List of unique user names
    modules: List[str]                   # List of unique module names
    actions: List[str]                   # List of unique action names

# --- BOM Schemas ---
class BOMComponentBase(BaseModel):
    component_sku: str
    quantity: Decimal

class BOMComponentCreate(BOMComponentBase):
    pass

class BOMComponentResponse(BOMComponentBase):
    id: int
    bom_id: int

    class Config:
        from_attributes = True

class BOMOperationBase(BaseModel):
    operation_name: str
    duration_mins: int
    work_center: Optional[str] = None

class BOMOperationCreate(BOMOperationBase):
    pass

class BOMOperationResponse(BOMOperationBase):
    id: int
    bom_id: int

    class Config:
        from_attributes = True

class BOMBase(BaseModel):
    product_sku: str
    name: str
    description: Optional[str] = None
    quantity: Decimal = Decimal('1.00')
    unit: str = "units"
    reference: Optional[str] = None

class BOMCreate(BOMBase):
    components: List[BOMComponentCreate]
    operations: List[BOMOperationCreate]

class BOMResponse(BOMBase):
    id: int
    components: List[BOMComponentResponse]
    operations: List[BOMOperationResponse]

    class Config:
        from_attributes = True


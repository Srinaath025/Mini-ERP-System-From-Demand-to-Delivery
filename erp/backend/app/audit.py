from datetime import datetime
from sqlalchemy.orm import Session
from .models import AuditLog

# This function is used to create and save a new audit log in the database.
# It takes the database session, user details, module name, record information, and changes made.
def log_audit(
    db: Session,
    user_id: int,
    user_name: str,
    module: str,
    record_type: str,
    record_id: str,
    action: str,
    field_changed: str = None,
    old_value: str = None,
    new_value: str = None
):
    """
    Utility helper to append a log entry into the audit_logs table.
    Does not commit the transaction, relying on the parent session commit instead.
    """
    try:
        # Create a new AuditLog object with the provided information
        log_entry = AuditLog(
            timestamp=datetime.utcnow(), # Set the current time in UTC
            user_id=user_id,             # The ID of the user who did the action
            user_name=user_name,         # The name of the user who did the action
            module=module,               # The ERP module (Sales, Purchase, Manufacturing, etc.)
            record_type=record_type,     # The type of record (Product, Item, Sales Order, etc.)
            record_id=str(record_id),    # The unique identifier of the record (like SKU or Order Number)
            action=action,               # The action done: Created, Updated, or Deleted
            field_changed=field_changed, # The name of the field that was changed, if any
            old_value=str(old_value) if old_value is not None else None, # The value before change
            new_value=str(new_value) if new_value is not None else None  # The value after change
        )
        
        # Add the log entry to the active database transaction session
        db.add(log_entry)
        
        # Flush the session to verify database constraints without committing the transaction yet
        db.flush()
    except Exception as e:
        # Print an error message if the logging fails
        print(f"Audit log recording failed: {e}")

# This function determines if a SKU represents a component item or a finished product.
# We do this based on the prefix of the SKU name.
def get_product_record_type(sku: str) -> str:
    """
    Determine if SKU represents a raw 'Item' or a finished 'Product' matching screenshot specs.
    """
    # If the SKU starts with "ITEM-" (case-insensitive), we treat it as a component "Item"
    if sku and sku.upper().startswith("ITEM-"):
        return "Item"
    # Otherwise, we treat it as a finished "Product"
    return "Product"


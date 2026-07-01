from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, date, time
from ..database import get_db
from .. import models, schemas, auth

# We create the router for audit logs with URL prefix "/api/audit-logs"
router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])

# This helper checks if the logged-in user has 'admin_panel' permission.
# If they do not, it blocks them with a 403 Forbidden error.
def verify_admin(current_user: models.User = Depends(auth.PermissionChecker("admin_panel"))):
    return current_user

# Endpoint to list audit logs. It supports pagination, search, and filtering by user, module, action, and dates.
@router.get("", response_model=schemas.AuditLogPaginatedResponse)
def list_audit_logs(
    page: int = 1,                      # The page number to fetch (starts from 1)
    limit: int = 10,                    # The maximum number of logs to show on one page
    module: Optional[str] = None,       # Filter logs by module name (e.g. Sales, Purchase)
    user_name: Optional[str] = None,    # Filter logs by the name of the user who made the change
    action: Optional[str] = None,       # Filter logs by action type (Created, Updated, Deleted)
    start_date: Optional[str] = None,  # Filter logs starting from this date (format: YYYY-MM-DD)
    end_date: Optional[str] = None,    # Filter logs up to this date (format: YYYY-MM-DD)
    search: Optional[str] = None,      # Search text matching record ID or the changed field name
    db: Session = Depends(get_db),      # The database session connection
    current_user: models.User = Depends(verify_admin) # Ensures only approved Admins can call this
):
    # Start a base query on the AuditLog database model
    query = db.query(models.AuditLog)

    # 1. Filter by Module if a specific module is selected
    if module and module not in ["All", "All Modules"]:
        query = query.filter(models.AuditLog.module == module)
        
    # 2. Filter by User Name if a specific user is selected
    if user_name and user_name not in ["All", "All Users"]:
        query = query.filter(models.AuditLog.user_name == user_name)

    # 3. Filter by Action type if a specific action is selected
    if action and action not in ["All", "All Actions"]:
        query = query.filter(models.AuditLog.action == action)

    # 4. Filter by Start Date (from the beginning of the selected day)
    if start_date:
        try:
            sd = datetime.combine(date.fromisoformat(start_date), time.min)
            query = query.filter(models.AuditLog.timestamp >= sd)
        except ValueError:
            pass

    # 5. Filter by End Date (until the end of the selected day)
    if end_date:
        try:
            ed = datetime.combine(date.fromisoformat(end_date), time.max)
            query = query.filter(models.AuditLog.timestamp <= ed)
        except ValueError:
            pass

    # 6. Filter by Search Query matching record ID or changed field name
    if search:
        query = query.filter(
            or_(
                models.AuditLog.record_id.ilike(f"%{search}%"),
                models.AuditLog.field_changed.ilike(f"%{search}%")
            )
        )

    # Count the total number of logs matching all applied filters
    total_count = query.count()
    
    # Calculate the total number of pages needed for pagination
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
    
    # Fetch logs for the current page, sorted by time (newest first)
    logs = query.order_by(models.AuditLog.timestamp.desc()).offset((page - 1) * limit).limit(limit).all()

    # Return the logs list along with pagination metadata
    return {
        "logs": logs,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

# Endpoint to fetch overall all-time statistics counts.
@router.get("/stats", response_model=schemas.AuditLogStatsResponse)
def get_audit_log_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_admin)
):
    # Fetch total log entries count
    total = db.query(models.AuditLog).count()
    
    # Fetch count of logs where records were created
    created = db.query(models.AuditLog).filter(models.AuditLog.action == "Created").count()
    
    # Fetch count of logs where records were updated
    updated = db.query(models.AuditLog).filter(models.AuditLog.action == "Updated").count()
    
    # Fetch count of logs where records were deleted
    deleted = db.query(models.AuditLog).filter(models.AuditLog.action == "Deleted").count()

    # Return the statistics counts
    return {
        "total": total,
        "created": created,
        "updated": updated,
        "deleted": deleted
    }

# Endpoint to fetch unique values for the frontend filter dropdown lists.
@router.get("/filters", response_model=schemas.AuditLogFiltersResponse)
def get_audit_log_filters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_admin)
):
    # Fetch unique user names, module names, and action types present in existing log records
    users = db.query(models.AuditLog.user_name).distinct().filter(models.AuditLog.user_name != None).all()
    modules = db.query(models.AuditLog.module).distinct().filter(models.AuditLog.module != None).all()
    actions = db.query(models.AuditLog.action).distinct().filter(models.AuditLog.action != None).all()

    # Convert query result tuples into flat lists of strings
    user_list = [u[0] for u in users]
    module_list = [m[0] for m in modules]
    action_list = [a[0] for a in actions]

    # Ensure default options are always returned, even if the database table is empty
    for u in ["tara1234", "poiuyt", "Amit Sharma", "Neha Verma", "Ravi Patel", "Meera Singh"]:
        if u not in user_list:
            user_list.append(u)
            
    for m in ["Sales", "Purchase", "Manufacturing"]:
        if m not in module_list:
            module_list.append(m)

    for a in ["Created", "Updated", "Deleted"]:
        if a not in action_list:
            action_list.append(a)

    # Return sorted dropdown choices for the frontend controls
    return {
        "users": sorted(user_list),
        "modules": sorted(module_list),
        "actions": sorted(action_list)
    }


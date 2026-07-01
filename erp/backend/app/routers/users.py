from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/api/users", tags=["Users & Permissions"])

# All users endpoints require Admin role or admin_panel permission
def verify_admin(current_user: models.User = Depends(auth.PermissionChecker("admin_panel"))):
    return current_user

@router.get("", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(verify_admin)):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@router.post("", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_admin)
):
    # Check if username or email exists
    existing_username = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    existing_email = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )



    # Validate role
    if user_in.role not in ["Admin", "User"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Role must be 'Admin' or 'User'."
        )

    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        name=user_in.name,
        username=user_in.username,
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role,
        is_approved=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}/approve", response_model=schemas.UserResponse)
def approve_user(user_id: int, approval: schemas.UserApproval, db: Session = Depends(get_db), current_user: models.User = Depends(verify_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own approval status")
        
    user.is_approved = approval.is_approved
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/role", response_model=schemas.UserResponse)
def update_user_role(user_id: int, role_update: schemas.UserUpdateRole, db: Session = Depends(get_db), current_user: models.User = Depends(verify_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
        
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(verify_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")
        
    db.delete(user)
    db.commit()
    return None

# --- Permission Management ---
@router.get("/permissions", response_model=List[schemas.RolePermissionResponse])
def get_all_permissions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.RolePermission).all()

@router.put("/permissions/{role}", response_model=schemas.RolePermissionResponse)
def update_permissions(role: str, perm_in: schemas.RolePermissionBase, db: Session = Depends(get_db), current_user: models.User = Depends(verify_admin)):
    if role == "Admin":
        raise HTTPException(status_code=400, detail="Admin permissions cannot be modified")
        
    perm = db.query(models.RolePermission).filter(models.RolePermission.role == role).first()
    if not perm:
        perm = models.RolePermission(role=role)
        db.add(perm)
        
    perm.admin_panel = perm_in.admin_panel
    perm.sales_order = perm_in.sales_order
    perm.purchase_order = perm_in.purchase_order
    perm.manufacturing_order = perm_in.manufacturing_order
    perm.products = perm_in.products
    perm.accounts = perm_in.accounts
    perm.settings = perm_in.settings
    
    db.commit()
    db.refresh(perm)
    return perm

@router.put("/me/profile", response_model=schemas.UserResponse)
def update_my_profile(
    profile: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if profile.name is not None:
        current_user.name = profile.name
    if profile.phone is not None:
        current_user.phone = profile.phone
    if profile.address is not None:
        current_user.address = profile.address
    if profile.position is not None:
        current_user.position = profile.position
    if profile.photo_url is not None:
        current_user.photo_url = profile.photo_url
    db.commit()
    db.refresh(current_user)
    return current_user


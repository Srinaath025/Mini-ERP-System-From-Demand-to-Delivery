from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

from sqlalchemy import func

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    clean_username = user_in.username.strip()
    clean_email = user_in.email.strip()

    # Check if username or email exists (case-insensitive)
    existing_username = db.query(models.User).filter(
        func.lower(models.User.username) == clean_username.lower()
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    existing_email = db.query(models.User).filter(
        func.lower(models.User.email) == clean_email.lower()
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if this is the first user. If so, default to Admin. Otherwise respect user_in.role.
    total_users = db.query(models.User).count()
    assigned_role = "Admin" if total_users == 0 else (user_in.role if user_in.role in ["Admin", "Co-Admin", "User"] else "User")

    hashed_password = auth.get_password_hash(user_in.password)
    new_user = models.User(
        name=user_in.name.strip(),
        username=clean_username,
        email=clean_email,
        password_hash=hashed_password,
        role=assigned_role,
        is_approved=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Query user case-insensitively using username or email or login prefix
    input_str = form_data.username.strip().lower()
    user = db.query(models.User).filter(
        (func.lower(models.User.username) == input_str) |
        (func.lower(models.User.email) == input_str) |
        (func.lower(models.User.username) == f"{input_str}@example.com") |
        (func.lower(models.User.email) == f"{input_str}@example.com")
    ).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval."
        )
        
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

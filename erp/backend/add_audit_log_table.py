import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models import AuditLog

AuditLog.__table__.create(engine, checkfirst=True)
print("AuditLog table created successfully!")

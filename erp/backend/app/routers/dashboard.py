from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from .. import models, auth
from ..database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _count(db, model, status=None, username=None):
    q = db.query(model)
    if status:
        q = q.filter(model.status == status)
    if username and hasattr(model, "assigned_to"):
        q = q.filter(model.assigned_to == username)
    return q.count()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    today = date.today()

    # ── Sales ──────────────────────────────────────────────────────────────
    so_all = db.query(models.SalesOrder)
    sales_statuses = ["Draft", "Confirmed", "Partially Delivered", "Delivered", "Cancelled"]
    sales_all = {s: so_all.filter(models.SalesOrder.status == s).count() for s in sales_statuses}

    # "Late" = Confirmed orders whose order_date has passed
    sales_all["Late"] = so_all.filter(
        models.SalesOrder.status == "Confirmed",
        models.SalesOrder.order_date < today
    ).count()

    # ── Purchases ──────────────────────────────────────────────────────────
    po_all = db.query(models.PurchaseOrder)
    purchase_statuses = ["Draft", "Confirmed", "Partially Received", "Received", "Cancelled"]
    purchase_all = {s: po_all.filter(models.PurchaseOrder.status == s).count() for s in purchase_statuses}
    purchase_all["Late"] = po_all.filter(
        models.PurchaseOrder.status == "Confirmed",
        models.PurchaseOrder.order_date < today
    ).count()

    # ── Manufacturing ──────────────────────────────────────────────────────
    mo_all_q = db.query(models.ManufacturingOrder)
    mfg_statuses = ["Draft", "Confirmed", "In Progress", "To Close", "Done", "Cancelled"]
    mfg_all = {s: mo_all_q.filter(models.ManufacturingOrder.status == s).count() for s in mfg_statuses}

    return {
        "sales": {
            "all": sales_all,
        },
        "purchases": {
            "all": purchase_all,
        },
        "manufacturing": {
            "all": mfg_all,
        },
    }

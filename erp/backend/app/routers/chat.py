from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from ..database import get_db
from .. import models, auth
import re

router = APIRouter(prefix="/api/chat", tags=["AI Chatbot"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("", response_model=ChatResponse)
def handle_chat_query(
    req: ChatRequest, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    query = req.message.lower().strip()
    
    # 1. Hello / Help / General Agent Info
    if any(k in query for k in ["hello", "hi", "hey", "help", "who are you", "what can you do"]):
        reply = (
            f"Hello **{current_user.name}**! 👋 I am your **ERP AI Assistant**.\n\n"
            "I can analyze our database and generate real-time operational insights. Try asking me about:\n"
            "- **Inventory**: *'Which products are low in stock?'* or *'What is the stock level of PROD-001?'*\n"
            "- **Sales**: *'What is our total sales revenue?'* or *'Show me completed sales orders.'*\n"
            "- **Procurement**: *'How much did we spend on purchase orders?'*\n"
            "- **Manufacturing**: *'What are our scheduled manufacturing orders?'* or *'Show recipes.'*\n"
            "- **Audit logs**: *'What are the recent changes?'*\n"
            "- **General summary**: *'Give me erp insights'* or *'Show dashboard status.'*"
        )
        return ChatResponse(reply=reply)

    # Database filter queries: "filter products out of stock", "filter sales confirmed", etc.
    if "filter" in query or "show" in query or "list" in query:
        status_match = re.search(r'\b(draft|confirmed|delivered|received|completed|cancelled)\b', query)
        status = status_match.group(1).title() if status_match else None

        if "product" in query or "inventory" in query or "stock" in query:
            products_q = db.query(models.Product)
            if "out of stock" in query:
                products_q = products_q.filter(models.Product.stock_level <= 0)
            elif "low" in query:
                products_q = products_q.filter(models.Product.stock_level <= models.Product.reorder_point)
            rows = products_q.order_by(models.Product.name.asc()).limit(10).all()
            if not rows:
                return ChatResponse(reply="No products matched that database filter.")
            table = "| Product | Category | Stock | Source |\n| :--- | :--- | :--- | :--- |\n"
            for p in rows:
                table += f"| {p.name} | {p.category or 'Unassigned'} | {p.stock_level} | {p.procurement_type} |\n"
            return ChatResponse(reply=f"### Database Filter: Products\n{table}")

        if "sale" in query:
            sales_q = db.query(models.SalesOrder)
            if status:
                sales_q = sales_q.filter(models.SalesOrder.status == status)
            rows = sales_q.order_by(models.SalesOrder.order_date.desc()).limit(10).all()
            if not rows:
                return ChatResponse(reply="No sales orders matched that database filter.")
            table = "| SO Number | Customer | Total | Status |\n| :--- | :--- | :--- | :--- |\n"
            for so in rows:
                table += f"| `{so.so_number}` | {so.customer_name} | ₹{float(so.total):,.2f} | {so.status} |\n"
            return ChatResponse(reply=f"### Database Filter: Sales Orders\n{table}")

        if "purchase" in query:
            po_q = db.query(models.PurchaseOrder)
            if status:
                po_q = po_q.filter(models.PurchaseOrder.status == status)
            rows = po_q.order_by(models.PurchaseOrder.order_date.desc()).limit(10).all()
            if not rows:
                return ChatResponse(reply="No purchase orders matched that database filter.")
            table = "| PO Number | Vendor | Total | Status |\n| :--- | :--- | :--- | :--- |\n"
            for po in rows:
                table += f"| `{po.po_number}` | {po.supplier_name} | ₹{float(po.total):,.2f} | {po.status} |\n"
            return ChatResponse(reply=f"### Database Filter: Purchase Orders\n{table}")

        if "manufacturing" in query or "mfg" in query:
            mo_q = db.query(models.ManufacturingOrder)
            if status:
                mo_q = mo_q.filter(models.ManufacturingOrder.status == status)
            rows = mo_q.order_by(models.ManufacturingOrder.start_date.desc()).limit(10).all()
            if not rows:
                return ChatResponse(reply="No manufacturing orders matched that database filter.")
            table = "| MO Number | Product | Qty | Status |\n| :--- | :--- | :--- | :--- |\n"
            for mo in rows:
                table += f"| `{mo.mo_number}` | {mo.product.name if mo.product else mo.product_sku} | {mo.quantity} | {mo.status} |\n"
            return ChatResponse(reply=f"### Database Filter: Manufacturing Orders\n{table}")

    # 2. ERP Summary Insights / Dashboard Status
    if any(k in query for k in ["insight", "summary", "dashboard", "status", "general overview"]):
        prod_count = db.query(models.Product).count()
        low_stock_count = db.query(models.Product).filter(models.Product.stock_level <= models.Product.reorder_point).count()
        
        # Sales revenue (sum total of delivered orders)
        sales_rev_res = db.query(func.sum(models.SalesOrder.total)).filter(
            models.SalesOrder.status == "Delivered"
        ).scalar()
        sales_rev = float(sales_rev_res) if sales_rev_res else 0.0
        sales_count = db.query(models.SalesOrder).count()
        
        # Procurement spend (sum total of received purchase orders)
        purch_spend_res = db.query(func.sum(models.PurchaseOrder.total)).filter(
            models.PurchaseOrder.status == "Received"
        ).scalar()
        purch_spend = float(purch_spend_res) if purch_spend_res else 0.0
        purch_count = db.query(models.PurchaseOrder).count()
        
        # Manufacturing schedules
        mfg_pending = db.query(models.ManufacturingOrder).filter(
            models.ManufacturingOrder.status.in_(["Draft", "Confirmed", "Pending", "In Progress"])
        ).count()
        
        reply = (
            "### 📊 Real-Time ERP Insights Summary\n\n"
            f"Here is the current high-level status of **Shiv Furniture Works**:\n\n"
            f"1. **Inventory & Products**:\n"
            f"   - Total products cataloged: **{prod_count}**\n"
            f"   - Products with **low stock alerts**: **{low_stock_count}**\n\n"
            f"2. **Sales Performance**:\n"
            f"   - Total sales transactions: **{sales_count}**\n"
            f"   - Total generated revenue (Delivered): **₹{sales_rev:,.2f}**\n\n"
            f"3. **Procurement & Purchase**:\n"
            f"   - Total purchase orders placed: **{purch_count}**\n"
            f"   - Total capital spent: **₹{purch_spend:,.2f}**\n\n"
            f"4. **Manufacturing Activity**:\n"
            f"   - Active/scheduled manufacturing runs: **{mfg_pending} orders**\n\n"
            "Would you like me to drill down into any specific module or product item?"
        )
        return ChatResponse(reply=reply)

    # 3. Inventory low stock query
    if any(k in query for k in ["low stock", "low inventory", "below reorder", "reorder alert", "out of stock"]):
        low_prods = db.query(models.Product).filter(models.Product.stock_level <= models.Product.reorder_point).all()
        if not low_prods:
            return ChatResponse(reply="✅ Great news! All products are currently stocked above their reorder point thresholds.")
        
        table = "| Product | Stock Level | Reorder Pt | Procure Type |\n| :--- | :--- | :--- | :--- |\n"
        for p in low_prods:
            table += f"| {p.name} | **{p.stock_level}** | {p.reorder_point} | {p.procurement_type} |\n"
        
        reply = (
            "### ⚠️ Low Stock Alert Items\n"
            "The following items have dropped below or met their reorder parameters:\n\n"
            f"{table}\n"
            "You can trigger Purchase Orders or Manufacturing runs for these items to replenish inventory."
        )
        return ChatResponse(reply=reply)

    # 4. Search specific product stock level
    sku_match = re.search(r'(prod|comp)-\d+', query)
    if sku_match:
        target_sku = sku_match.group(0).upper()
        p = db.query(models.Product).filter(models.Product.sku == target_sku).first()
        if p:
            reply = (
                f"### 📦 Product Information: `{p.sku}`\n"
                f"- **Name**: {p.name}\n"
                f"- **Category**: {p.category or 'Unassigned'}\n"
                f"- **Current Stock**: **{p.stock_level} units**\n"
                f"- **Reorder Limit**: {p.reorder_point} units\n"
                f"- **Unit Price**: ₹{float(p.price):,.2f}\n"
                f"- **Procurement Policy**: {p.procurement_type} ({'MTO - On Demand' if p.procure_on_demand else 'MTS - On Stock'})\n\n"
                f"Stock health: {'🟢 Healthy' if p.stock_level > p.reorder_point else '🔴 Reorder Needed'}"
            )
            return ChatResponse(reply=reply)

    # 5. Sales Query
    if "sale" in query or "revenue" in query or "income" in query:
        sales = db.query(models.SalesOrder).all()
        if not sales:
            return ChatResponse(reply="No sales orders have been logged in the system yet.")
        
        sales_rev_res = db.query(func.sum(models.SalesOrder.total)).filter(
            models.SalesOrder.status == "Delivered"
        ).scalar()
        sales_rev = float(sales_rev_res) if sales_rev_res else 0.0
        
        # Group by status
        statuses = db.query(models.SalesOrder.status, func.count(models.SalesOrder.so_number)).group_by(models.SalesOrder.status).all()
        status_breakdown = ", ".join([f"**{count}** {st}" for st, count in statuses])
        
        # Recent orders
        recent = db.query(models.SalesOrder).order_by(models.SalesOrder.order_date.desc()).limit(5).all()
        table = "| SO Number | Customer | Total | Status |\n| :--- | :--- | :--- | :--- |\n"
        for r in recent:
            table += f"| `{r.so_number}` | {r.customer_name} | ₹{float(r.total):,.2f} | {r.status} |\n"
            
        reply = (
            "### 📈 Sales Operations Insights\n"
            f"- **Total Revenue**: **₹{sales_rev:,.2f}**\n"
            f"- **Status Breakdown**: {status_breakdown}\n\n"
            f"**Last 5 Sales Orders placed**:\n"
            f"{table}"
        )
        return ChatResponse(reply=reply)

    # 6. Purchase Query
    if "purchase" in query or "procurement" in query or "spend" in query or "expense" in query:
        purchases = db.query(models.PurchaseOrder).all()
        if not purchases:
            return ChatResponse(reply="No purchase orders have been logged in the system yet.")
        
        purch_spend_res = db.query(func.sum(models.PurchaseOrder.total)).filter(
            models.PurchaseOrder.status == "Received"
        ).scalar()
        purch_spend = float(purch_spend_res) if purch_spend_res else 0.0
        
        statuses = db.query(models.PurchaseOrder.status, func.count(models.PurchaseOrder.po_number)).group_by(models.PurchaseOrder.status).all()
        status_breakdown = ", ".join([f"**{count}** {st}" for st, count in statuses])
        
        recent = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.order_date.desc()).limit(5).all()
        table = "| PO Number | Supplier | Grand Total | Status |\n| :--- | :--- | :--- | :--- |\n"
        for r in recent:
            table += f"| `{r.po_number}` | {r.supplier_name} | ₹{float(r.total):,.2f} | {r.status} |\n"
            
        reply = (
            "### 🛒 Purchase & Procurement Spend Analysis\n"
            f"- **Total Capital Expended**: **₹{purch_spend:,.2f}**\n"
            f"- **PO Breakdown**: {status_breakdown}\n\n"
            f"**Last 5 Purchase Contracts negotiated**:\n"
            f"{table}"
        )
        return ChatResponse(reply=reply)

    # 7. Manufacturing Query / BOM
    if any(k in query for k in ["manufacturing", "mfg", "assembly", "recipe", "bom", "bill of materials"]):
        mfg_orders = db.query(models.ManufacturingOrder).count()
        boms = db.query(models.BOM).count()
        
        mfg_statuses = db.query(models.ManufacturingOrder.status, func.count(models.ManufacturingOrder.mo_number)).group_by(models.ManufacturingOrder.status).all()
        status_breakdown = ", ".join([f"**{count}** {st}" for st, count in mfg_statuses])
        
        recent = db.query(models.ManufacturingOrder).order_by(models.ManufacturingOrder.start_date.desc()).limit(5).all()
        table = "| MO Number | Product | Qty | Status |\n| :--- | :--- | :--- | :--- |\n"
        for r in recent:
            table += f"| `{r.mo_number}` | {r.product.name if r.product else r.product_sku} | {r.quantity} | {r.status} |\n"
            
        reply = (
            "### 🔨 Manufacturing & BOM Status\n"
            f"- **Total Manufacturing Runs**: **{mfg_orders}** ({status_breakdown})\n"
            f"- **Configured Output BOM Recipes**: **{boms}**\n\n"
            f"**Recent Assembly Orders**:\n"
            f"{table}"
        )
        return ChatResponse(reply=reply)

    # 8. Audit Logs Activity
    if any(k in query for k in ["audit", "log", "change", "activity", "user action"]):
        logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(5).all()
        if not logs:
            return ChatResponse(reply="No operational changes have been audited yet.")
            
        table = "| Time | User | Module | Action | Record ID |\n| :--- | :--- | :--- | :--- | :--- |\n"
        for l in logs:
            time_str = l.timestamp.strftime("%Y-%m-%d %H:%M")
            table += f"| {time_str} | {l.user_name} | {l.module} | **{l.action}** | `{l.record_id}` |\n"
            
        reply = (
            "### 🛡️ Recent System Activity Logs\n"
            "Here are the 5 most recent modifications tracked by the database auditor:\n\n"
            f"{table}"
        )
        return ChatResponse(reply=reply)

    # 9. Fallback: general query parsing showing summaries
    reply = (
        f"I received: *\"{req.message}\"*.\n\n"
        "I was unable to map this specific request to a database filter. "
        "Try asking me about **inventory stock**, **sales revenue**, **manufacturing status**, **audit activity**, or type **'give me erp insights'**."
    )
    return ChatResponse(reply=reply)

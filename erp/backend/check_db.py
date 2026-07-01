import sqlite3
import pandas as pd

conn = sqlite3.connect('d:/Projects/erp/backend/erp.db')

print("USERS:")
print(pd.read_sql_query("SELECT id, username, role FROM users LIMIT 5", conn))

print("\nPERMISSIONS:")
print(pd.read_sql_query("SELECT * FROM role_permissions LIMIT 5", conn))

print("\nSALES:")
print(pd.read_sql_query("SELECT status, count(*) FROM sales_orders GROUP BY status", conn))

print("\nPURCHASES:")
print(pd.read_sql_query("SELECT status, count(*) FROM purchase_orders GROUP BY status", conn))

print("\nMFG:")
print(pd.read_sql_query("SELECT status, count(*) FROM manufacturing_orders GROUP BY status", conn))

conn.close()

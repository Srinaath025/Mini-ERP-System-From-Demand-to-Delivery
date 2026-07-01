import os

search_term = "password"
print("Searching for term:", search_term)

for root, dirs, files in os.walk("."):
    # skip venv, node_modules, git
    if any(k in root for k in ["venv", "node_modules", ".git", "__pycache__"]):
        continue
    for file in files:
        if file.endswith((".py", ".tsx", ".ts", ".js", ".html", ".css")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if search_term in content.lower():
                        print(f"Found in: {path}")
            except:
                pass

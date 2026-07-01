# MiniERP v2 - Enterprise Resource Planning System

A lightweight, modern Enterprise Resource Planning (ERP) application designed with a robust Python/FastAPI backend and a fast, responsive React/TypeScript frontend.

---

## 🚀 Features

- **📊 Dashboard & Analytics**: High-level overview of sales, purchases, manufacturing progress, and inventory metrics with dynamic charts.
- **🔐 Authentication & Role-Based Access Control (RBAC)**: Secure user registration and login with roles (`Admin` and `User`) determining module permissions.
- **📦 Product Catalog**: Manage products with custom procurement strategies (Make-to-Stock / Make-to-Order), cost prices, and vendor details.
- **💰 Sales Order Management**: Manage sales pipelines, track order status, and log customer transactions.
- **📥 Purchase Order Management**: Streamline procurement from suppliers, track incoming shipments, and restock products.
- **🏭 Manufacturing & Bill of Materials (BOM)**:
  - Configure multi-component Bills of Materials (BOM).
  - Create and track Manufacturing Orders (MO) to handle assembly pipelines.
- **📜 System Audit Logs**: Traceable record of critical database operations and actions for transparency.
- **💬 Built-in AI Assistant**: Interactive chat interface for querying inventory status, sales metrics, or system help.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (SQLAlchemy ORM)
- **Security**: JWT-based Authentication & Password Hashing (bcrypt)
- **Dependencies**: Uvicorn, Pandas, Pydantic

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Premium Custom Vanilla CSS (with responsive layout, dark/light themes, and smooth transition animations)
- **Router**: React Router v7
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

---

## 📂 Project Structure

```text
minierpv2/
├── erp/
│   ├── backend/                # FastAPI application
│   │   ├── app/                # Main app modules (routers, schemas, models)
│   │   ├── venv/               # Python Virtual Environment
│   │   ├── database.db         # Local SQLite DB
│   │   └── check_db.py         # DB diagnostics utility
│   └── frontend/               # React + Vite application
│       ├── src/                # Components, pages, styles, context
│       ├── public/             # Static assets
│       └── package.json        # Frontend dependencies & scripts
└── README.md                   # Project documentation (this file)
```

---

## ⚙️ Getting Started

### Prerequisites
- Python 3.10+
- Node.js (v18+) & npm

---

### Step 1: Set Up and Run the Backend

1. **Navigate to the backend directory**:
   ```bash
   cd erp/backend
   ```

2. **Activate the Virtual Environment**:
   - **On Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **On Windows (Command Prompt)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **On macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies** (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: FastAPI, SQLAlchemy, Uvicorn, Pandas, and Pydantic must be installed in the venv)*

4. **Start the FastAPI Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will run at **`http://localhost:8000`**. You can access the Swagger API docs at **`http://localhost:8000/docs`**.

---

### Step 2: Set Up and Run the Frontend

1. **Open a new terminal window** and navigate to the frontend directory:
   ```bash
   cd erp/frontend
   ```

2. **Install node packages**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will run at **`http://localhost:5173`**.

---

## 🐙 Pushing the Project to GitHub

Follow these steps to initialize Git and push the project to your GitHub repository:

1. **Open your terminal at the root directory** (`D:\Projects\minierpv2`):
   ```bash
   cd D:\Projects\minierpv2
   ```

2. **Initialize Git repository** (if not already done):
   ```bash
   git init
   ```

3. **Stage all files for commit**:
   ```bash
   git add .
   ```

4. **Commit the files**:
   ```bash
   git commit -m "Initial commit: MiniERP v2 implementation"
   ```

5. **Link your local repository to GitHub**:
   *Replace the URL with your actual GitHub repository URL:*
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
   ```

6. **Rename default branch to `main`**:
   ```bash
   git branch -M main
   ```

7. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

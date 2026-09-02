# 📋 ERP Forms — Unified Monorepo

Enterprise Resource Planning (ERP) web forms and backend services designed for **Gatepass Outward** management and **Repacking / Production Form** tracking with seamless **ERPNext** integration and **Model Context Protocol (MCP)** support.

---

## 🏗️ Project Architecture

```
ERP-Forms/
├── backend/                  # Express.js REST API + ERPNext Integration + MCP Server (Port 5000)
│   ├── .env.example          # Environment variables template
│   └── src/
│       ├── config/           # ERPNext & server configuration
│       ├── mcp/              # MCP Server (Model Context Protocol)
│       ├── middleware/       # Zod validation & error middleware
│       ├── routes/           # API routes (Gatepass & Production Form)
│       ├── services/         # ERPNext & business logic services
│       ├── types/            # TypeScript models and interfaces
│       └── server.ts         # Express entry point
│
├── frontend/                 # Unified React + Vite + TanStack Router UI (Port 3000)
│   ├── public/               # Static assets & icons
│   └── src/
│       ├── components/       # shadcn/ui & form components (Gatepass & Repacking)
│       ├── hooks/            # Custom React hooks (useProductionForm)
│       ├── lib/              # API clients & utilities
│       ├── routes/           # TanStack Router file-based routes
│       ├── App.tsx           # App root component
│       └── styles.css        # Tailwind CSS v4 & Urdu typography
│
└── package.json              # Root Monorepo Scripts (concurrently runner)
```

---

## ✨ Unified Features

1. **📦 Repacking Form (`مال کی تیاری کی تفصیل`)**:
   - RTL Urdu typography & responsive A4 print layout.
   - Real-time material calculations, batch selection, and totals.
   - Direct ERPNext Stock Entry creation (`Repack` / `Manufacture`).

2. **🚪 Gatepass Form (`گیٹ پاس آؤٹ ورڈ`)**:
   - Digital gatepass generation with item details, vehicle, and driver tracking.
   - Dynamic QR Code generation for instant verification.
   - Direct ERPNext Material Transfer creation.

3. **📑 Material Transfers Viewer**:
   - Real-time list of ERPNext transfers with 1-click loading into gatepass forms.

4. **🤖 MCP Server**:
   - Model Context Protocol server enabling AI assistants to query ERPNext items and submit forms.

---

## 🚀 Quick Start (Root Scripts)

### Prerequisites
- **Node.js**: `v18+` or `v20+` (Recommended `v22+` / `v24+`)
- **npm** or **pnpm** / **bun**
- **ERPNext Instance** with API Key & Secret

---

### 1. Install All Dependencies

```sh
# Root dependencies
npm install

# Backend dependencies
npm run install --prefix backend

# Frontend dependencies
npm run install --prefix frontend
```

---

### 2. Configure Backend Environment

Copy `.env.example` inside `backend/` and configure your ERPNext credentials:
```sh
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
ERPNEXT_URL=http://your-erpnext-domain:8000
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
ERPNEXT_DOCTYPE=Stock Entry
```

---

### 3. Run Backend & Frontend Together (Single Command)

From the root directory:
```sh
npm run dev
```

> **Note**: This runs both **Backend** (`http://localhost:5000`) and **Frontend** (`http://localhost:3000`) concurrently.

---

## 🛠️ Individual Subproject Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Run both Backend and Frontend concurrently |
| `npm run dev:backend` | Run Express Backend only (with hot-reload) |
| `npm run dev:frontend` | Run Unified Frontend only (Vite dev server) |
| `npm run build` | Build both Backend and Frontend for production |
| `npm run build:backend` | Build Backend (`tsc`) |
| `npm run build:frontend` | Build Frontend (`vite build`) |
| `npm run start` | Start production Backend server |
| `npm run mcp` | Start Model Context Protocol (MCP) server |

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Backend health check & ERPNext connection status |
| `POST` | `/api/gatepass` | Create new Gatepass entry in ERPNext |
| `GET` | `/api/gatepass/:id` | Fetch Gatepass entry details |
| `POST` | `/api/production-form/submit` | Submit Repacking / Production Form to ERPNext |
| `GET` | `/api/production-form/items` | Fetch item master details from ERPNext |
| `GET` | `/api/production-form/warehouses` | Fetch warehouses from ERPNext |
| `GET` | `/api/production-form/transfers` | Fetch material transfers from ERPNext |

---

## 📄 License
This repository is private and proprietary.


# 📋 ERP Forms — Monorepo

Enterprise Resource Planning (ERP) web forms and backend services designed for **Gatepass Outward** management and **Repacking / Production Form** tracking with seamless **ERPNext** integration and **Model Context Protocol (MCP)** support.

---

## 🏗️ Project Architecture

```
ERP-Forms/
├── backend/                  # Express.js REST API + ERPNext Integration + MCP Server
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
├── Gatepass Frontend/        # Gatepass Outward Application UI
│   ├── public/               # Static assets & icons
│   └── src/
│       ├── components/       # shadcn/ui & custom Gatepass form components
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # API clients & utilities
│       ├── routes/           # TanStack Router file-based routes
│       └── App.tsx           # App root component
│
└── Repacking frontend/       # Repacking & Production Form Application UI (RTL Urdu)
    ├── public/               # Static assets & icons
    └── src/
        ├── components/       # Production Form Table & Sheet components
        ├── hooks/            # Custom form state & ERPNext hooks
        └── App.tsx           # RTL Urdu layout & form container
```

---

## ✨ Features

### 1. 🚪 Gatepass Frontend
- **Gatepass Outward Form**: Digital creation and tracking of gate passes for materials leaving company premises.
- **Modern UI**: Built with TanStack Router, Tailwind CSS v4, and shadcn/ui components.
- **Real-Time Validation**: Field validations and error handling.
- **QR Code Generation**: QR code embedding for gate verification.

### 2. 📦 Repacking Frontend (Urdu Production Form)
- **RTL Urdu Typography**: Native Right-to-Left (RTL) interface in Urdu (`مال کی تیاری کی تفصیل`).
- **Dynamic Production Calculations**: Real-time computation of materials, quantities, batching, and totals.
- **ERPNext Stock Entry Sync**: Direct submission to ERPNext doctypes.

### 3. ⚙️ Backend Service
- **RESTful API**: Endpoints for Gatepass (`/api/gatepass`) and Production Form (`/api/production-form`).
- **ERPNext Integration**: Comprehensive ERPNext API client handling authentication, doctype submission, and error handling.
- **MCP Server**: Model Context Protocol server enabling AI assistants to query and create ERP records.
- **Robust Validation**: Zod schema validation for all incoming payloads.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18+` or `v20+` (Recommended `v22+` / `v24+`)
- **npm** or **bun** / **pnpm**
- **ERPNext Instance** (v13, v14, or v15) with API Key & Secret

---

### 1. Backend Setup

1. Open terminal in `backend/`:
   ```sh
   cd backend
   npm install
   ```

2. Configure environment variables:
   ```sh
   cp .env.example .env
   ```

3. Update `.env` with your ERPNext details:
   ```env
   PORT=5000
   ERPNEXT_URL=http://your-erpnext-domain:8000
   ERPNEXT_API_KEY=your_api_key
   ERPNEXT_API_SECRET=your_api_secret
   ERPNEXT_DOCTYPE=Stock Entry
   ```

4. Run Backend in development mode:
   ```sh
   npm run dev
   ```
   *Backend runs on `http://localhost:5000`*

---

### 2. Gatepass Frontend Setup

1. Open terminal in `Gatepass Frontend/`:
   ```sh
   cd "Gatepass Frontend"
   npm install
   ```

2. Start the development server:
   ```sh
   npm run dev
   ```
   *App will launch on `http://localhost:3000` (or Vite's designated port).*

3. Build for production:
   ```sh
   npm run build
   ```

---

### 3. Repacking Frontend Setup

1. Open terminal in `Repacking frontend/`:
   ```sh
   cd "Repacking frontend"
   npm install
   ```

2. Start the development server:
   ```sh
   npm run dev
   ```
   *App will launch on Vite's local dev server.*

3. Build for production:
   ```sh
   npm run build
   ```

---

## 🤖 Model Context Protocol (MCP) Server

To run the MCP server for AI integration:
```sh
cd backend
npm run mcp
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Backend health check |
| `POST` | `/api/gatepass` | Create new Gatepass entry in ERPNext |
| `GET` | `/api/gatepass/:id` | Fetch Gatepass entry details |
| `POST` | `/api/production-form/submit` | Submit Repacking / Production Form to ERPNext |
| `GET` | `/api/production-form/items` | Fetch item master details from ERPNext |

---

## 📄 License
This repository is private and proprietary.


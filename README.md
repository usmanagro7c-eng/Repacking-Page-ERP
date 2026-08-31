# مال کی تیاری کی تفصیل — Urdu Production Form (Full Stack + ERPNext + MCP)

Decoupled full-stack application with separate **Frontend** (React + Vite UI), **Backend** (Express.js API + ERPNext Integration), and **MCP Server**.

## 📁 Project Structure

```
├── frontend/             # React + Vite Frontend UI (Port 3000)
├── backend/              # Express.js REST API + ERPNext Client + MCP Server (Port 5000)
│   ├── .env              # ERPNext Credentials & Configuration
│   └── src/
│       ├── services/     # Form logic & ERPNext integration service
│       ├── routes/       # Express routes (/api/production-form)
│       └── mcp/          # Model Context Protocol (MCP) server
└── package.json          # Root Monorepo Scripts
```

## 🚀 How to Run

### 1. Install Dependencies
```sh
npm install
npm run install --prefix backend
npm run install --prefix frontend
```

### 2. Configure ERPNext Connection
Edit `backend/.env`:
```env
PORT=5000
ERPNEXT_URL=http://your-erpnext-domain.com
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
ERPNEXT_DOCTYPE=Stock Entry
```

### 3. Run Backend (Express API)
```sh
npm run dev:backend
```

### 4. Run Frontend (React UI)
```sh
npm run dev:frontend
```

### 5. Run MCP Server (for Claude / AI Assistants)
```sh
npm run mcp
```

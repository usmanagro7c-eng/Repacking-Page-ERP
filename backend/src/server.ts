import { httpServerHandler } from "cloudflare:node";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { gatepassRouter } from "./routes/gatepass.routes.js";
import { productionFormRouter } from "./routes/production-form.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { erpnextConfig } from "./config/erpnext.config.js";

dotenv.config();

const app = express();

// Cloudflare Workers Express integration uses a fixed internal port.
const PORT = 3000;

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const time = new Date().toISOString().substring(11, 19);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const badge = status >= 400 ? "❌" : "✅";

    console.log(
      `[${time}] ${badge} ${req.method} ${req.originalUrl} - ${status} (${duration}ms)`,
    );
  });

  next();
});

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "MMMC ERPNext Integrated Suite (Gatepass & Repacking)",
    erpnextConfigured: erpnextConfig.isConfigured,
    erpnextDocType: erpnextConfig.docType,
    erpnextUrl: erpnextConfig.url,
  });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/gatepass", gatepassRouter);
app.use("/api/production-form", productionFormRouter);

// Global Error Handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("🔥 Global Express Backend Error:", err);

    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  },
);

// Cloudflare Workers + Express
app.listen(PORT);

export default httpServerHandler({
  port: PORT,
});

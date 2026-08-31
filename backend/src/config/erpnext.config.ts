import dotenv from "dotenv";

dotenv.config();

export const erpnextConfig = {
  url: process.env.ERPNEXT_URL || "http://localhost:8000",
  apiKey: process.env.ERPNEXT_API_KEY || "",
  apiSecret: process.env.ERPNEXT_API_SECRET || "",
  docType: process.env.ERPNEXT_DOCTYPE || "Stock Entry",

  get isConfigured(): boolean {
    return Boolean(this.url && this.apiKey && this.apiSecret);
  },

  get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `token ${this.apiKey}:${this.apiSecret}`,
    };
  },
};

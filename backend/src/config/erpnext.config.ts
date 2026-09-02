import dotenv from "dotenv";

dotenv.config();

export interface ErpnextRuntimeConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
  docType: string;
  defaultRawWarehouse: string;
  defaultFinishedWarehouse: string;
}

class ErpnextConfigManager {
  private config: ErpnextRuntimeConfig = {
    url: (process.env.ERPNEXT_URL || "https://dev16.mmmc.pk").replace(/\/$/, ""),
    apiKey: process.env.ERPNEXT_API_KEY || "",
    apiSecret: process.env.ERPNEXT_API_SECRET || "",
    docType: process.env.ERPNEXT_DOCTYPE || "Stock Entry",
    defaultRawWarehouse: process.env.ERPNEXT_RAW_WAREHOUSE || "Stores - T",
    defaultFinishedWarehouse: process.env.ERPNEXT_FINISHED_WAREHOUSE || "Finished Goods - T",
  };

  public get url(): string {
    return this.config.url.replace(/\/$/, "");
  }

  public get apiKey(): string {
    return this.config.apiKey;
  }

  public get apiSecret(): string {
    return this.config.apiSecret;
  }

  public get docType(): string {
    return this.config.docType;
  }

  public get defaultRawWarehouse(): string {
    return this.config.defaultRawWarehouse;
  }

  public get defaultFinishedWarehouse(): string {
    return this.config.defaultFinishedWarehouse;
  }

  public get isConfigured(): boolean {
    return Boolean(this.config.url && this.config.apiKey && this.config.apiSecret);
  }

  public get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `token ${this.config.apiKey}:${this.config.apiSecret}`,
    };
  }

  public updateConfig(newConfig: Partial<ErpnextRuntimeConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      url: (newConfig.url || this.config.url).replace(/\/$/, ""),
    };
  }

  public getConfig(): ErpnextRuntimeConfig {
    return { ...this.config };
  }
}

export const erpnextConfig = new ErpnextConfigManager();

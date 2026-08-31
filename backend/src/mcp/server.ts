import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { globalProductionFormService } from "../services/production-form.service.js";
import { erpnextService } from "../services/erpnext.service.js";
import { validateProductionFormInput } from "../middleware/validation.middleware.js";

export function createMcpServer() {
  const server = new Server(
    {
      name: "urdu-production-form-erpnext-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_production_form",
          description: "Get the current Urdu Production Form data (مال کی تیاری کی تفصیل) and computed weight/bag totals.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "update_production_form",
          description: "Update fields in the Urdu Production Form.",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string" },
              formNo: { type: "string" },
              rawName: { type: "array", items: { type: "string" } },
              totalWeight: { type: "array", items: { type: "string" } },
              cutting25: { type: "array", items: { type: "string" } },
              cutting50: { type: "array", items: { type: "string" } },
              lotNo: { type: "array", items: { type: "string" } },
              remaining: { type: "array", items: { type: "string" } },
              readyName: { type: "string" },
              readyLot: { type: "string" },
              readyBags: { type: "string" },
              readyWeight: { type: "array", items: { type: "string" } },
              stock: { type: "string" },
              notes: { type: "string" },
              signMaker: { type: "string" },
              signIncharge: { type: "string" },
            },
          },
        },
        {
          name: "sync_to_erpnext",
          description: "Sync the current production form directly to ERPNext via REST API.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "calculate_form_summary",
          description: "Calculate totals and bag counts for the production form.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "reset_production_form",
          description: "Reset the production form to an empty template.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_production_form": {
        const form = globalProductionFormService.getForm();
        const summary = globalProductionFormService.calculateSummary(form);
        return {
          content: [{ type: "text", text: JSON.stringify({ form, summary }, null, 2) }],
        };
      }

      case "update_production_form": {
        const validation = validateProductionFormInput(args);
        if (!validation.success) {
          return {
            isError: true,
            content: [{ type: "text", text: `Validation error: ${validation.errors.join("; ")}` }],
          };
        }

        const updated = globalProductionFormService.updateForm(validation.data);
        const summary = globalProductionFormService.calculateSummary(updated);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ message: "Form updated successfully", form: updated, summary }, null, 2),
            },
          ],
        };
      }

      case "sync_to_erpnext": {
        const currentForm = globalProductionFormService.getForm();
        const summary = globalProductionFormService.calculateSummary(currentForm);
        const result = await erpnextService.syncProductionForm(currentForm, summary);

        if (!result.success) {
          return {
            isError: true,
            content: [{ type: "text", text: `ERPNext sync error: ${result.error}` }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { message: `Successfully synced to ERPNext document ${result.documentName}`, result },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "calculate_form_summary": {
        const form = globalProductionFormService.getForm();
        const summary = globalProductionFormService.calculateSummary(form);
        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
        };
      }

      case "reset_production_form": {
        const reset = globalProductionFormService.resetForm();
        return {
          content: [{ type: "text", text: JSON.stringify({ message: "Form reset", form: reset }, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "production-form://current",
          name: "Current Production Form Data",
          mimeType: "application/json",
          description: "Live state of the active production form",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === "production-form://current") {
      const form = globalProductionFormService.getForm();
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(form, null, 2) }],
      };
    }
    throw new Error(`Resource not found: ${uri}`);
  });

  return server;
}

export async function runMcpServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Urdu Production Form & ERPNext MCP Server running on stdio");
}

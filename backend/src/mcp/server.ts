import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { globalGatePassService } from "../services/gatepass.service.js";
import { erpnextService } from "../services/erpnext.service.js";
import { validateGatePassInput } from "../middleware/validation.middleware.js";

export function createMcpServer() {
  const server = new Server(
    {
      name: "mmmc-gatepass-erpnext-mcp",
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
          name: "get_gate_pass",
          description:
            "Get the active MMMC Gate Pass data (Outward or Inward) and calculated weight/quantity summaries.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["outward", "inward"], default: "outward" },
            },
          },
        },
        {
          name: "update_gate_pass",
          description: "Update fields in the active Gate Pass form.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["outward", "inward"], default: "outward" },
              no: { type: "string" },
              date: { type: "string" },
              adda: { type: "string" },
              baraye: { type: "string" },
              party: { type: "string" },
              phone: { type: "string" },
              fromWarehouse: { type: "string" },
              toWarehouse: { type: "string" },
              vehicle: { type: "string" },
              driver: { type: "string" },
              contact: { type: "string" },
              rickshaw: { type: "string" },
              extra: { type: "string" },
              rows: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    qty: { type: "string" },
                    packing: { type: "string" },
                    detail: { type: "string" },
                    weight: { type: "string" },
                  },
                },
              },
            },
          },
        },
        {
          name: "sync_gatepass_to_erpnext",
          description: "Sync the active Gate Pass to ERPNext as a Material Transfer Stock Entry.",
          inputSchema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["outward", "inward"], default: "outward" },
            },
          },
        },
        {
          name: "create_inward_from_outward",
          description: "Generate a corresponding Inward Gate Pass from an Outward Gate Pass.",
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
    const type = (args?.type as "outward" | "inward") || "outward";

    switch (name) {
      case "get_gate_pass": {
        const form = globalGatePassService.getForm(type);
        const summary = globalGatePassService.calculateSummary(form);
        return {
          content: [{ type: "text", text: JSON.stringify({ form, summary }, null, 2) }],
        };
      }

      case "update_gate_pass": {
        const validation = validateGatePassInput(args);
        if (!validation.success) {
          return {
            isError: true,
            content: [{ type: "text", text: `Validation error: ${validation.errors.join("; ")}` }],
          };
        }

        const updated = globalGatePassService.updateForm(type, validation.data);
        const summary = globalGatePassService.calculateSummary(updated);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { message: "Gate pass updated successfully", form: updated, summary },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "sync_gatepass_to_erpnext": {
        const currentForm = globalGatePassService.getForm(type);
        const result = await erpnextService.syncGatePass(currentForm);

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
                {
                  message: `Successfully synced to ERPNext document: ${result.documentName}`,
                  result,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "create_inward_from_outward": {
        const outward = globalGatePassService.getForm("outward");
        const inward = globalGatePassService.createInwardFromOutward(outward);
        const summary = globalGatePassService.calculateSummary(inward);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { message: "Inward pass created from Outward pass", form: inward, summary },
                null,
                2,
              ),
            },
          ],
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
          uri: "gatepass://current/outward",
          name: "Current Outward Gate Pass Data",
          mimeType: "application/json",
          description: "Live state of the active Outward Gate Pass",
        },
        {
          uri: "gatepass://current/inward",
          name: "Current Inward Gate Pass Data",
          mimeType: "application/json",
          description: "Live state of the active Inward Gate Pass",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === "gatepass://current/outward") {
      const form = globalGatePassService.getForm("outward");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(form, null, 2) }],
      };
    }
    if (uri === "gatepass://current/inward") {
      const form = globalGatePassService.getForm("inward");
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
  console.error("MMMC Gate Pass & ERPNext MCP Server running on stdio");
}

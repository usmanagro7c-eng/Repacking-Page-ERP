import { runMcpServer } from "./server.js";

runMcpServer().catch((error) => {
  console.error("Fatal error running MCP server:", error);
  process.exit(1);
});

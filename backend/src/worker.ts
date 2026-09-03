import { httpServerHandler } from "cloudflare:node";
import { app } from "./server.js";

const PORT = 3000;

export default httpServerHandler({
  port: PORT,
});

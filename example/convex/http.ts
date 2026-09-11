import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { Linear } from "../../src/client/index.js";

const linear = new Linear(components.convexLinear, {
  apiKey: process.env.LINEAR_API_KEY!,
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/linear",
  method: "POST",
  handler: linear.webhookHandler,
});

export default http;

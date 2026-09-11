import { defineApp } from "convex/server";
import convexLinear from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexLinear);

export default app;

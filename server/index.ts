// --- server/index.ts with added logging ---
console.log('[SERVER_INDEX_LOG] Top of server/index.ts execution.'); // Line A

import express, { type Request, Response, NextFunction } from "express";
console.log('[SERVER_INDEX_LOG] Imported Express.'); // Line B

import { registerRoutes } from "./routes";
console.log('[SERVER_INDEX_LOG] Imported registerRoutes.'); // Line C

import { setupVite, serveStatic, log as viteLog } from "./vite"; // Renamed log to avoid conflict if any
console.log('[SERVER_INDEX_LOG] Imported from ./vite.'); // Line D

const app = express();
console.log('[SERVER_INDEX_LOG] Express app created.'); // Line E

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
console.log('[SERVER_INDEX_LOG] Basic middleware (json, urlencoded) configured.'); // Line F

// Your custom logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  // viteLog('Custom logging middleware entry', 'ServerIndexMiddleware'); // Using imported log

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      viteLog(logLine, "ServerIndexMiddlewareAPI"); // Using imported log
    }
  });
  next();
});
console.log('[SERVER_INDEX_LOG] Custom logging middleware configured.'); // Line G

(async () => {
  console.log('[SERVER_INDEX_LOG] IIFE started.'); // Line H

  viteLog("Attempting to register routes.", "ServerIndexRoutes");
  const server = await registerRoutes(app); // Pass app here
  viteLog("Finished registering routes.", "ServerIndexRoutes");
  console.log('[SERVER_INDEX_LOG] Routes registered.'); // Line I

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    viteLog(`Error middleware: ${status} - ${message}`, "ServerIndexError");
    res.status(status).json({ message });
    // It's often better not to re-throw the error here unless you have another handler
    // throw err;
  });
  console.log('[SERVER_INDEX_LOG] Error handling middleware configured.'); // Line J

  viteLog(`Current app environment: ${app.get("env")}`, "ServerIndexEnv");
  if (app.get("env") === "development") {
    console.log('[SERVER_INDEX_LOG] Entering DEVELOPMENT setup path (setupVite).'); // Line K_DEV
    await setupVite(app, server);
  } else {
    console.log('[SERVER_INDEX_LOG] Entering PRODUCTION setup path (serveStatic).'); // Line K_PROD
    serveStatic(app); // This should call the ServeStatic_V3 version
    console.log('[SERVER_INDEX_LOG] Called serveStatic.'); // Line L_PROD
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  console.log(`[SERVER_INDEX_LOG] Port configured: ${port}. Attempting to listen.`); // Line M

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    viteLog(`Server IS LISTENING on port ${port}`, "ServerIndexListen"); // Using imported log
    console.log(`[SERVER_INDEX_LOG] Server IS LISTENING on port ${port}.`); // Line N
    if (process.env.RAILWAY_STATIC_URL) {
        console.log(`[SERVER_INDEX_LOG] App available at: https://${process.env.RAILWAY_STATIC_URL}`);
    }
  });
})().catch(err => {
  // Catch errors from the IIFE promise chain
  console.error('[SERVER_INDEX_CRITICAL_IIFE_ERROR]', err);
  viteLog(`CRITICAL IIFE ERROR: ${err.message}`, "ServerIndexIIFE_ERROR");
  process.exit(1); // Exit if the main async setup fails
});

process.on('uncaughtException', (err, origin) => {
  console.error(`[SERVER_INDEX_UNCAUGHT_EXCEPTION] Origin: ${origin}`, err);
  viteLog(`UNCAUGHT_EXCEPTION: Origin: ${origin}, Error: ${err.message}`, "ServerIndexProcessError");
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER_INDEX_UNHANDLED_REJECTION] At:', promise, 'reason:', reason);
  viteLog(`UNHANDLED_REJECTION: Reason: ${reason}`, "ServerIndexProcessError");
  process.exit(1);
});

console.log('[SERVER_INDEX_LOG] Bottom of server/index.ts synchronous execution.'); // Line O
// --- End of server/index.ts ---

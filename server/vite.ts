import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config"; // Assuming this path is correct relative to server/vite.ts
import { nanoid } from "nanoid";
import { fileURLToPath } from 'url'; // <-- ADD THIS IMPORT

const viteLogger = createLogger();

// YOUR EXISTING LOG FUNCTION (IT'S GOOD!)
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// YOUR EXISTING setupVite FUNCTION (FOR DEVELOPMENT - NO CHANGES NEEDED HERE FOR PRODUCTION)
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // This path resolution is for development, pointing to the source client/index.html
      const clientTemplate = path.resolve(
        // import.meta.dirname here refers to server/ (source)
        // so ../client/index.html is correct for dev
        path.dirname(fileURLToPath(import.meta.url)), // More robust way to get dirname
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// --- REPLACE YOUR OLD serveStatic WITH THIS NEW VERSION ---
export function serveStatic(app: Express) {
  log("Attempting to configure static file serving for production.", "ServeStatic");

  // Robustly get the directory name of the current module (dist/vite.js when deployed)
  const currentModulePath = fileURLToPath(import.meta.url);
  // When dist/vite.js runs, currentModuleDir will be PROJECT_ROOT/dist/
  const currentModuleDir = path.dirname(currentModulePath);
  log(`Current module path (import.meta.url resolved): ${currentModulePath}`, "ServeStatic");
  log(`Current module directory (expected PROJECT_ROOT/dist/): ${currentModuleDir}`, "ServeStatic");

  const publicDirName = "public";
  // This should resolve to PROJECT_ROOT/dist/public/
  const distPath = path.resolve(currentModuleDir, publicDirName);
  log(`Resolved 'distPath' for client assets (expected PROJECT_ROOT/dist/public/): ${distPath}`, "ServeStatic");

  if (!fs.existsSync(distPath)) {
    const errorMsg = `CRITICAL: Build directory '${publicDirName}' NOT FOUND at calculated path: ${distPath}. Make sure 'vite build' ran and output to 'dist/public'.`;
    log(errorMsg, "ServeStatic_ERROR");
    try {
      const parentDirContents = fs.readdirSync(currentModuleDir);
      log(`Contents of ${currentModuleDir} (expected to be PROJECT_ROOT/dist/): ${parentDirContents.join(', ')}`, "ServeStatic_INFO");
    } catch (e: any) {
      log(`Error listing contents of ${currentModuleDir}: ${e.message}`, "ServeStatic_ERROR");
    }
    throw new Error(errorMsg); // This will crash the app, good for diagnostics
  } else {
    log(`SUCCESS: Build directory '${publicDirName}' FOUND at: ${distPath}`, "ServeStatic");
    try {
      const publicDirContents = fs.readdirSync(distPath);
      log(`Contents of ${distPath} (expected to be PROJECT_ROOT/dist/public/): ${publicDirContents.join(', ')}`, "ServeStatic_INFO");
    } catch (e: any) {
      log(`Error listing contents of ${distPath}: ${e.message}`, "ServeStatic_ERROR");
    }
  }

  // Log incoming requests before they hit express.static
  // This middleware needs to be added to the app instance *before* express.static
  app.use((req, _res, next) => {
    log(`Incoming request: ${req.method} ${req.originalUrl}`, "ServeStatic_Request");
    next();
  });

  app.use(express.static(distPath));
  log(`Express static middleware configured for path: ${distPath}`, "ServeStatic");

  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    log(`Fallback: Request for '${req.originalUrl}'. Attempting to serve index.html from: ${indexPath}`, "ServeStatic_Fallback");

    if (!fs.existsSync(indexPath)) {
      const errorMsg = `CRITICAL: index.html NOT FOUND at: ${indexPath}`;
      log(errorMsg, "ServeStatic_ERROR");
      res.status(404).send(`${errorMsg}. Please check build artifacts and paths.`);
      return;
    }

    res.sendFile(indexPath, (err) => {
      if (err) {
        log(`Error sending index.html for ${req.originalUrl}: ${(err as Error).message}`, "ServeStatic_ERROR");
        if (!res.headersSent) {
          res.status(500).send("Server error trying to serve application.");
        }
      } else {
        log(`Successfully sent index.html for ${req.originalUrl}`, "ServeStatic_Fallback");
      }
    });
  });
  log("Static file serving configuration complete.", "ServeStatic");
}
// --- END OF REPLACEMENT ---

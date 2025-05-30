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



// --- THIS IS THE "ServeStatic_V3" VERSION ---
export function serveStatic(app: Express) {
  log("Attempting to configure static file serving for production.", "ServeStatic_V3");

  const cwd = process.cwd();
  log(`Current working directory (process.cwd()): ${cwd}`, "ServeStatic_V3_Path");

  let scriptRunningFromDir: string | undefined = undefined;
  if (typeof cwd === 'string' && cwd.length > 0) { // Added check for non-empty string
    scriptRunningFromDir = path.resolve(cwd, "dist");
    log(`Calculated 'scriptRunningFromDir': ${scriptRunningFromDir}`, "ServeStatic_V3_Path");
  } else {
    log(`CRITICAL_ERROR: process.cwd() did not return a valid string. Received: '${cwd}' (type: ${typeof cwd})`, "ServeStatic_V3_Path_Error");
    // If cwd is not a string, scriptRunningFromDir will remain undefined.
    // We will throw an error soon if critical paths are undefined.
  }

  const publicDirName = "public";
  let distPath: string | undefined = undefined;
  if (typeof scriptRunningFromDir === 'string' && scriptRunningFromDir.length > 0) { // Added check for non-empty string
    distPath = path.join(scriptRunningFromDir, publicDirName);
    log(`Calculated 'distPath' for client assets: ${distPath}`, "ServeStatic_V3_Path");
  } else {
    log(`CRITICAL_ERROR: 'scriptRunningFromDir' is not a valid string (was '${scriptRunningFromDir}', type: ${typeof scriptRunningFromDir}). Cannot calculate distPath.`, "ServeStatic_V3_Path_Error");
    // distPath will remain undefined.
  }

  // --- VERBOSE CHECK FOR distPath BEFORE path.resolve for indexPath ---
  log(`Value of 'distPath' immediately before resolving indexPath: ${distPath} (type: ${typeof distPath})`, "ServeStatic_V3_Path_PreResolve");

  if (typeof distPath !== 'string' || distPath.length === 0) { // Added check for non-empty string
    const errorMsg = `CRITICAL_ERROR: 'distPath' is NOT a valid string before resolving indexPath. Aborting static setup. Value: '${distPath}'`;
    log(errorMsg, "ServeStatic_V3_ERROR");
    throw new Error(errorMsg); // Crash loudly if distPath is not a usable string
  }
  // --- END VERBOSE CHECK ---

  // Now, this is the path.resolve that might be dist/index.js:197 if distPath was undefined previously
  const indexPath = path.resolve(distPath, "index.html");
  log(`Resolved 'indexPath': ${indexPath}`, "ServeStatic_V3_Path");


  if (!fs.existsSync(distPath)) {
    const errorMsg = `CRITICAL: Build directory '${publicDirName}' NOT FOUND at calculated path: ${distPath}.`;
    log(errorMsg, "ServeStatic_V3_ERROR");
    try {
      // Check if scriptRunningFromDir exists to list its contents
      if (typeof scriptRunningFromDir === 'string' && fs.existsSync(scriptRunningFromDir)) {
        const parentDirContents = fs.readdirSync(scriptRunningFromDir);
        log(`Contents of ${scriptRunningFromDir}: ${parentDirContents.join(', ')}`, "ServeStatic_V3_INFO");
      } else {
        log(`Directory ${scriptRunningFromDir} does not exist or is not a string, cannot list contents.`, "ServeStatic_V3_INFO");
      }
    } catch (e: any) {
      log(`Error listing contents of ${scriptRunningFromDir}: ${e.message}`, "ServeStatic_V3_ERROR");
    }
    throw new Error(errorMsg);
  } else {
    log(`SUCCESS: Build directory '${publicDirName}' FOUND at: ${distPath}`, "ServeStatic_V3");
    try {
      const publicDirContents = fs.readdirSync(distPath);
      log(`Contents of ${distPath}: ${publicDirContents.join(', ')}`, "ServeStatic_V3_INFO");
    } catch (e: any) {
      log(`Error listing contents of ${distPath}: ${e.message}`, "ServeStatic_V3_ERROR");
    }
  }

  app.use((req, _res, next) => {
    log(`Incoming request: ${req.method} ${req.originalUrl}`, "ServeStatic_V3_Request");
    next();
  });

  app.use(express.static(distPath));
  log(`Express static middleware configured for path: ${distPath}`, "ServeStatic_V3");

  app.use("*", (req, res) => {
    // --- VERBOSE CHECK FOR distPath AND indexPath BEFORE res.sendFile ---
    log(`Fallback: Value of 'distPath' for sendFile: ${distPath} (type: ${typeof distPath})`, "ServeStatic_V3_Fallback_Path");
    log(`Fallback: Value of 'indexPath' for sendFile: ${indexPath} (type: ${typeof indexPath})`, "ServeStatic_V3_Fallback_Path");

    if (typeof indexPath !== 'string' || indexPath.length === 0 || !fs.existsSync(indexPath)) { // Added check for non-empty string
      const errorMsg = `CRITICAL: index.html NOT FOUND (path: ${indexPath}, exists: ${typeof indexPath === 'string' && indexPath.length > 0 ? fs.existsSync(indexPath) : 'path not valid string'}).`;
      log(errorMsg, "ServeStatic_V3_ERROR");
      res.status(404).send(`${errorMsg}. Please check build artifacts and paths.`);
      return;
    }
    // --- END VERBOSE CHECK ---

    res.sendFile(indexPath, (err) => {
      if (err) {
        log(`Error sending index.html for ${req.originalUrl}: ${(err as Error).message}`, "ServeStatic_V3_ERROR");
        if (!res.headersSent) {
          res.status(500).send("Server error trying to serve application.");
        }
      } else {
        log(`Successfully sent index.html for ${req.originalUrl}`, "ServeStatic_V3_Fallback");
      }
    });
  });
  log("Static file serving configuration complete.", "ServeStatic_V3");
}
// --- END OF "ServeStatic_V3" VERSION ---

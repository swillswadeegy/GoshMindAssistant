// server/index.ts - Step towards original functionality

console.log('[STEP_2_LOG] Top of server/index.ts execution.');

import express from 'express';
console.log('[STEP_2_LOG] Imported Express.');

// Assuming log and serveStatic are exported from your server/vite.ts
// Ensure server/vite.ts is in the same directory or adjust path.
import { log as viteLog, serveStatic } from './vite';
console.log('[STEP_2_LOG] Imported log and serveStatic from ./vite.');

const app = express();
console.log('[STEP_2_LOG] Express app created.');

// We are in production mode (NODE_ENV=production is set by start command)
viteLog("Calling serveStatic (ServeStatic_V3 version)...", "ServerIndex");
try {
    serveStatic(app); // This will call the ServeStatic_V3 version
    viteLog("Returned from serveStatic call.", "ServerIndex");
} catch (e: any) {
    viteLog(`ERROR during serveStatic call: ${e.message}`, "ServerIndex_ERROR");
    console.error('[STEP_2_LOG] CRASH DURING serveStatic call:', e);
    process.exit(1); // Exit if serveStatic setup itself crashes
}


const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000; // Ensure PORT is a number
console.log(`[STEP_2_LOG] Port configured: ${PORT}. Attempting to listen.`);

// Use app.listen() now that we have an Express app
app.listen(PORT, "0.0.0.0", () => {
  viteLog(`Express server IS LISTENING on port ${PORT}`, "ServerIndexListen");
  console.log(`[STEP_2_LOG] Express server IS LISTENING on port ${PORT}.`);
});

console.log('[STEP_2_LOG] Bottom of server/index.ts synchronous execution.');

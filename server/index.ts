// --- START OF TEMPORARY server/index.ts FOR SMOKE TEST ---
console.log(`[SMOKE_TEST_NODE] Node.js version: ${process.version}`);
console.log(`[SMOKE_TEST_NODE] Current working directory: ${process.cwd()}`);
console.log(`[SMOKE_TEST_ENV] RAW process.env.NODE_ENV: ${process.env.NODE_ENV}`);

import express from "express";
const app = express(); // Initialize app early to use app.get('env')

console.log(`[SMOKE_TEST_ENV] app.get('env') result: ${app.get('env')}`);

// Simple log function for this test
const smokeLog = (message: string) => console.log(`[SMOKE_TEST_APP] ${new Date().toISOString()} ${message}`);

smokeLog("Application script (server/index.ts) has started.");

if (app.get("env") === "development") {
    smokeLog("CRITICAL_PATH_CHECK: app.get('env') is 'development'. Attempting to run development setup (setupVite). This is unexpected on Railway.");
    // To prevent actual setupVite from running and exiting during this test,
    // we'll just log and not call it. If this log appears, we've found the core issue.
} else {
    smokeLog("CRITICAL_PATH_CHECK: app.get('env') is NOT 'development' (expected 'production'). Attempting to run production setup (serveStatic).");
    // We'll also simplify this for now to just log
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
smokeLog(`Attempting to listen on port: ${port}`);

// A minimal server to see if it can even start listening
const http = await import('http');
const minimalServer = http.createServer((req, res) => {
    smokeLog(`Minimal server received request: ${req.method} ${req.url}`);
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        smokeLog("Responded to /health check OK");
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Minimal Test Server - Not Found');
        smokeLog(`Responded 404 for ${req.url}`);
    }
});

minimalServer.listen(port, "0.0.0.0", () => {
    smokeLog(`Minimal server IS LISTENING on port ${port}. If you see this, basic server start is OK.`);
    smokeLog(`Next, check CRITICAL_PATH_CHECK logs to see if 'development' or 'production' path was taken.`);
});

// Catch unhandled errors
process.on('uncaughtException', (err, origin) => {
  smokeLog(`!!! UNCAUGHT EXCEPTION !!! Origin: ${origin} Error: ${err.stack || err}`);
  // process.exit(1); // Don't exit immediately, let logs flush if possible
});

process.on('unhandledRejection', (reason, promise) => {
  smokeLog(`!!! UNHANDLED REJECTION !!! At: ${promise}, reason: ${reason instanceof Error ? reason.stack : reason}`);
  // process.exit(1);
});

// --- END OF TEMPORARY server/index.ts FOR SMOKE TEST ---

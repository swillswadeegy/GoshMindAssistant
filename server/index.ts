// TEMPORARY server/index.ts
import path from 'path'; // Keep this import

console.log('--- TOP OF SIMPLIFIED SERVER/INDEX.TS ---');
console.log(`Node.js version: ${process.version}`);
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Filename (__filename via import.meta.url): ${import.meta.url}`); // Test import.meta.url

try {
    const testPath = path.resolve(process.cwd(), 'test');
    console.log(`Test path.resolve(process.cwd(), 'test'): ${testPath}`);
} catch (e: any) {
    console.error('Error during test path.resolve:', e);
}

const PORT = process.env.PORT || 3001;

// Removed Express and all other imports/logic for this test
const http = await import('http'); // Keep as dynamic import for now
const server = http.createServer((req: any, res: any) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Ultra-Minimal Server OK\n');
  console.log('Responded to a request on ultra-minimal server.');
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`--- ULTRA-MINIMAL SERVER LISTENING ON PORT ${PORT} ---`);
});

console.log('--- BOTTOM OF SIMPLIFIED SERVER/INDEX.TS ---');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { router as apiRouter } from './routes/api.js';
import { initDb, sqlite } from './db/index.js';
import { seedDatabase } from './services/seed.js';
dotenv.config();
function logMemory(stage) {
    const mem = process.memoryUsage();
    console.log(`📊 [Memory ${stage}] RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`);
}
const app = express();
const PORT = Number(process.env.PORT) || 3001;
app.use(cors());
app.use(express.json());
// API Routes
app.use('/api', apiRouter);
app.get('/health', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        memory: {
            rssMb: Number((mem.rss / 1024 / 1024).toFixed(1)),
            heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
            heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(1))
        }
    });
});
// Locate and serve frontend static build directory
const possibleDistPaths = [
    path.resolve(process.cwd(), 'dist/client'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), 'dist')
];
const distPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
console.log(`📁 Serving frontend static files from: ${distPath}`);
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    // Fallback if index.html is truly missing
    res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head><title>Recura - Static Build Missing</title></head>
      <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; text-align: center;">
        <h2>⚡ Recura Server is Running on Port ${PORT}</h2>
        <p>index.html not found at <code>${distPath}</code>. Please run <code>npm run build</code>.</p>
      </body>
    </html>
  `);
});
async function startServer() {
    try {
        logMemory('Startup Baseline');
        console.log('⚡ Initializing Recura backend engine...');
        await initDb();
        logMemory('After Database Init');
        // Fast O(1) table count query using SQLite directly
        const row = sqlite.prepare('SELECT count(*) as count FROM transactions').get();
        const txCount = row ? row.count : 0;
        if (txCount === 0) {
            console.log('🌱 Database empty. Running initial synthetic dataset seed...');
            await seedDatabase(1200, 42);
            logMemory('After Database Seed');
        }
        else {
            console.log(`📦 Loaded existing database with ${txCount} transactions.`);
        }
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Recura Server running on http://0.0.0.0:${PORT}`);
            logMemory('Server Ready');
        });
    }
    catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}
startServer();

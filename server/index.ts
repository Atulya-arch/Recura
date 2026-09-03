import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { router as apiRouter } from './routes/api.js';
import { initDb, db } from './db/index.js';
import { seedDatabase } from './services/seed.js';
import { transactions } from './db/schema.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Recura Server Running</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; text-align: center;">
          <h2>⚡ Recura Backend API Server is Running on Port ${PORT}</h2>
          <p>Frontend dist bundle is building or available at <a href="http://localhost:3000" style="color: #818cf8;">http://localhost:3000</a></p>
        </body>
      </html>
    `);
  }
});

async function startServer() {
  try {
    console.log('⚡ Initializing Recura backend engine...');
    await initDb();

    // Check if database needs initial seed
    const txCount = (await db.select().from(transactions)).length;
    if (txCount === 0) {
      console.log('🌱 Database empty. Running initial synthetic dataset seed...');
      await seedDatabase(1200, 42);
    } else {
      console.log(`📦 Loaded existing database with ${txCount} transactions.`);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Recura Server running on http://127.0.0.1:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

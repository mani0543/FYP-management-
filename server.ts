import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabaseConnection } from './server/config/db.js';
import { seedInitialData } from './server/seed/seedData.js';
import apiRouter from './server/routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize DB and Seed Data
  await initDatabaseConnection();
  await seedInitialData(false);

  // Trust reverse proxy (Render / Cloud Run load balancers)
  app.set('trust proxy', 1);

  // Middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // Healthcheck endpoint for Render deployment probes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'fyp-management-system', timestamp: new Date().toISOString() });
  });

  // Mount API routes
  app.use('/api', apiRouter);

  // Catch any unmatched /api/* route so it returns JSON 404 instead of SPA index.html
  app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API route not found: ${req.originalUrl}` });
  });

  // Vite Dev Server or Production Static Serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FYP Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});

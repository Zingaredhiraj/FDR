import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { config } from './config';
import { logger } from './logger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import bankRoutes from './routes/banks';
import institutionRoutes from './routes/institutions';
import fdrRoutes from './routes/fdrs';
import documentRoutes from './routes/documents';
import releaseRoutes from './routes/releases';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import searchRoutes from './routes/search';
import auditRoutes from './routes/audit';
import settingsRoutes from './routes/settings';
import jobRoutes from './routes/jobs';
import publicRoutes from './routes/public';
import { swaggerSpec } from './swagger/swagger';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // disabled for Swagger UI
}));

// CORS
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// HTTP logger
app.use(pinoHttp({ logger }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiRateLimiter);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'AICTE FDR Vault API is running', timestamp: new Date().toISOString() });
});

// API routes
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/banks`, bankRoutes);
app.use(`${API}/institutions`, institutionRoutes);
app.use(`${API}/fdrs`, fdrRoutes);
app.use(`${API}/documents`, documentRoutes);
app.use(`${API}/releases`, releaseRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/search`, searchRoutes);
app.use(`${API}/audit`, auditRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/jobs`, jobRoutes);
app.use(`${API}/public`, publicRoutes);

// Static uploads (authenticated via download endpoint, not directly served)
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Central error handler
app.use(errorHandler);

export default app;

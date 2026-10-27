import './config'; // validate env first
import app from './app';
import { config } from './config';
import { logger } from './logger';
import { startStatusJob, runStatusJob } from './jobs/statusJob';
import { startAlertJob } from './jobs/alertJob';

const PORT = config.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 AICTE FDR Vault API running on http://localhost:${PORT}`);
  logger.info(`📖 Swagger docs: http://localhost:${PORT}/api/docs`);
  logger.info(`🌍 Environment: ${config.NODE_ENV}`);
});

// Start scheduled jobs (not in test env)
if (config.NODE_ENV !== 'test') {
  startStatusJob();
  startAlertJob();
  // Run status job on startup to catch any overdue changes
  runStatusJob().catch(err => logger.error(err, 'Initial status job failed'));
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default server;

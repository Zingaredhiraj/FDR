import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AICTE FDR Vault API',
      version: '1.0.0',
      description: 'API for managing security deposits and FDR records for AICTE-approved institutions. SIH 2026 Problem ID SIH26265.',
      contact: {
        name: 'AICTE FDR Vault',
        email: 'support@aicte.gov.in',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Users', description: 'User management (SUPER_ADMIN)' },
      { name: 'Banks', description: 'Bank master data' },
      { name: 'Institutions', description: 'Institution management' },
      { name: 'FDRs', description: 'Fixed Deposit Records' },
      { name: 'Documents', description: 'Document upload and verification' },
      { name: 'Releases', description: 'Release request workflow' },
      { name: 'Notifications', description: 'Notifications and preferences' },
      { name: 'Dashboard', description: 'Dashboard KPIs and charts' },
      { name: 'Reports', description: 'Reports and exports' },
      { name: 'Search', description: 'Global search' },
      { name: 'Audit', description: 'Audit log viewer' },
      { name: 'Settings', description: 'System settings' },
      { name: 'Jobs', description: 'Background job management' },
      { name: 'Public', description: 'Public endpoints (no auth required)' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

import { NextResponse } from 'next/server';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { createHandler } from 'next-swagger-doc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SENATOR INVESTECH API',
      version: '1.0.0',
      description: 'API documentation for system management',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./src/app/api/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const GET = createHandler({
  swaggerOptions: {
    spec: swaggerSpec,
  },
  customSiteTitle: 'SENATOR INVESTECH API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
});
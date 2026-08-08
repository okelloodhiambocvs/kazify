import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'Kazify API',
      version: '1.0.0',
      description:
        'API documentation for Kazify marketplace platform connecting customers and skilled fundis in Kenya. Includes authentication, jobs, escrow, payments, wallets, and notifications.',
    },

    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],

    tags: [
      {
        name: 'Authentication',
        description: 'User registration and authentication endpoints',
      },
      {
        name: 'Health',
        description: 'Application health monitoring endpoints',
      },
      {
        name: 'Jobs',
        description: 'Customer jobs and fundi matching services',
      },
      {
        name: 'Escrow',
        description: 'Escrow funding and release operations',
      },
      {
        name: 'Payments',
        description: 'M-Pesa payment processing endpoints',
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

      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
            },
          },
        },

        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
            },
            phone: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: [
                'customer',
                'fundi',
                'admin',
              ],
            },
          },
        },
      },
    },
  },

  apis: [
    './server/routes/*.ts',
    './server.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
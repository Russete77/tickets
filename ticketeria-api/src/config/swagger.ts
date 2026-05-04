import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env';

/**
 * OpenAPI 3.0.3 Specification for Ticketeria API
 * Generated from router and validator analysis
 */

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Ticketeria API',
    version: '1.0.0',
    description: 'API de gerenciamento de eventos e venda de ingressos - Plataforma de ingressos para eventos e shows',
    contact: {
      name: 'Ticketeria Support',
      url: 'https://ticketeria.com.br',
    },
    license: {
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 - Production',
    },
    {
      url: `${env.API_BASE_URL}/api/v1`,
      description: 'Development server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health check endpoint' },
    { name: 'Auth', description: 'Authentication and authorization' },
    { name: 'Users', description: 'User profile and account management' },
    { name: 'Events', description: 'Event creation, listing and details' },
    { name: 'Tickets', description: 'Ticket management and transfers' },
    { name: 'Orders', description: 'Order history and management' },
    { name: 'Payments', description: 'Payment processing and webhooks' },
    { name: 'Checkin', description: 'Event check-in and attendance tracking' },
    { name: 'Producers', description: 'Producer account and financial management' },
    { name: 'Affiliates', description: 'Affiliate links and commission tracking' },
    { name: 'Reports', description: 'Sales, checkin and financial reports' },
    { name: 'Admin', description: 'Admin dashboard and moderation tools' },
    { name: 'Favorites', description: 'User favorite events management' },
    { name: 'Live', description: 'Real-time social proof and live statistics' },
    { name: 'LGPD', description: 'LGPD compliance — data export, account deletion, consent (art. 18)' },
    { name: 'Health Deep', description: 'Liveness, readiness, deep health checks (DB, Redis, queues, breakers)' },
    { name: 'Metrics', description: 'Prometheus metrics endpoint (text/plain exposition)' },
    { name: 'Webhooks External', description: 'Webhooks de integradores externos (Sympla, Ingresso.com)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check if API is running',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string', example: '1.0.0' },
                        environment: { type: 'string', enum: ['development', 'production'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        description: 'Create a new user account',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'cpf', 'name', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  cpf: { type: 'string', pattern: '^\\d{11}$', example: '12345678901', description: 'CPF without formatting' },
                  name: { type: 'string', minLength: 3, maxLength: 255, example: 'João Silva' },
                  phone: { type: 'string', pattern: '^\\d{10,11}$', example: '11999999999', nullable: true },
                  password: { type: 'string', minLength: 8, example: 'SecurePass123!', description: 'Must contain uppercase, lowercase, number and special char' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User login',
        description: 'Authenticate user and return tokens',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'SecurePass123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string', description: 'JWT access token' },
                        refreshToken: { type: 'string', description: 'Refresh token for new access tokens' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/verify-2fa': {
      post: {
        tags: ['Auth'],
        summary: 'Verify 2FA code',
        description: 'Verify TOTP 2FA code for login',
        operationId: 'verify2fa',
        security: [{ optionalBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', pattern: '^\\d{6}$', example: '123456', description: '6-digit TOTP code' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '2FA verified',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Get a new access token using refresh token',
        operationId: 'refreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', description: 'Valid refresh token' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email address',
        description: 'Verify email using token sent to email',
        operationId: 'verifyEmail',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string', description: 'Email verification token' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        description: 'Send password reset email',
        operationId: 'forgotPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset email sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password',
        description: 'Reset password using token from email',
        operationId: 'resetPassword',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string', description: 'Password reset token' },
                  newPassword: { type: 'string', minLength: 8, example: 'NewSecurePass123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/enable-2fa': {
      post: {
        tags: ['Auth'],
        summary: 'Enable 2FA',
        description: 'Request 2FA setup (returns QR code)',
        operationId: 'enable2FA',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: '2FA setup initiated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        qrCode: { type: 'string', format: 'binary', description: 'QR code image' },
                        secret: { type: 'string', description: 'Backup secret key' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/confirm-2fa': {
      post: {
        tags: ['Auth'],
        summary: 'Confirm 2FA setup',
        description: 'Confirm 2FA setup by verifying TOTP code',
        operationId: 'confirm2FA',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '2FA confirmed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/disable-2fa': {
      post: {
        tags: ['Auth'],
        summary: 'Disable 2FA',
        description: 'Disable 2FA for account',
        operationId: 'disable2FA',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', description: 'User password for confirmation' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '2FA disabled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get user profile',
        description: 'Get current authenticated user profile',
        operationId: 'getProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user profile',
        description: 'Update current user profile information',
        operationId: 'updateProfile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 3, maxLength: 255 },
                  phone: { type: 'string', pattern: '^\\d{10,11}$' },
                  avatarUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete account (LGPD)',
        description: 'Permanently delete user account and data',
        operationId: 'deleteAccount',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', description: 'User password for confirmation' },
                },
              },
            },
          },
        },
        responses: {
          '204': {
            description: 'Account deleted',
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/me/change-password': {
      post: {
        tags: ['Users'],
        summary: 'Change password',
        description: 'Change user password',
        operationId: 'changePassword',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword', 'confirmPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                  confirmPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/me/orders': {
      get: {
        tags: ['Users'],
        summary: 'Get order history',
        description: 'Get user order history with cursor pagination',
        operationId: 'getOrderHistory',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/Cursor' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/Direction' },
        ],
        responses: {
          '200': {
            description: 'Order history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Order' },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/me/data': {
      get: {
        tags: ['Users'],
        summary: 'Export user data (LGPD)',
        description: 'Export all user data in JSON format',
        operationId: 'exportData',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User data exported',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/users/me/consent': {
      post: {
        tags: ['Users'],
        summary: 'Record consent',
        description: 'Record user consent for marketing/analytics',
        operationId: 'recordConsent',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['consentType', 'given'],
                properties: {
                  consentType: { type: 'string', enum: ['marketing', 'analytics', 'data_processing'] },
                  given: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Consent recorded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'Search events',
        description: 'Search events with filters and pagination',
        operationId: 'searchEvents',
        security: [{ optionalBearerAuth: [] }],
        parameters: [
          { name: 'query', in: 'query', schema: { type: 'string', maxLength: 255 } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['MUSIC', 'SPORTS', 'THEATER', 'CINEMA', 'OTHER'] } },
          { name: 'city', in: 'query', schema: { type: 'string', maxLength: 100 } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'priceMin', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'priceMax', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'isOpenBar', in: 'query', schema: { type: 'boolean' } },
          { $ref: '#/components/parameters/Cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Events list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Event' },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create event',
        description: 'Create new event (producer only)',
        operationId: 'createEvent',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEventInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Event created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/events/nearby': {
      get: {
        tags: ['Events'],
        summary: 'Search nearby events',
        description: 'Find events near geographic location',
        operationId: 'searchNearby',
        security: [{ optionalBearerAuth: [] }],
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number', minimum: -90, maximum: 90 } },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number', minimum: -180, maximum: 180 } },
          { name: 'radius', in: 'query', schema: { type: 'number', minimum: 0.1, maximum: 500, default: 10, description: 'Radius in kilometers' } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['MUSIC', 'SPORTS', 'THEATER', 'CINEMA', 'OTHER'] } },
          { name: 'minPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Nearby events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/events/weekend': {
      get: {
        tags: ['Events'],
        summary: 'Get weekend events',
        description: 'Get events happening this weekend',
        operationId: 'getWeekendEvents',
        security: [{ optionalBearerAuth: [] }],
        responses: {
          '200': {
            description: 'Weekend events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/events/trending': {
      get: {
        tags: ['Events'],
        summary: 'Get trending events',
        description: 'Get events with most sales/views',
        operationId: 'getTrendingEvents',
        security: [{ optionalBearerAuth: [] }],
        responses: {
          '200': {
            description: 'Trending events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/events/recommendations': {
      get: {
        tags: ['Events'],
        summary: 'Get personalized recommendations',
        description: 'Get recommended events based on user history',
        operationId: 'getRecommendations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Recommended events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/events/slug/{slug}': {
      get: {
        tags: ['Events'],
        summary: 'Get event by slug',
        description: 'Get event details using URL slug',
        operationId: 'getEventBySlug',
        security: [{ optionalBearerAuth: [] }],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Event details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Get event by ID',
        description: 'Get event details by UUID',
        operationId: 'getEvent',
        security: [{ optionalBearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Event details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Events'],
        summary: 'Update event',
        description: 'Update event (producer only)',
        operationId: 'updateEvent',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEventInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Event updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/events/{id}/publish': {
      post: {
        tags: ['Events'],
        summary: 'Publish event',
        description: 'Publish event (make it public)',
        operationId: 'publishEvent',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Event published',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/events/{id}/cancel': {
      post: {
        tags: ['Events'],
        summary: 'Cancel event',
        description: 'Cancel event (producer only)',
        operationId: 'cancelEvent',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Event cancelled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EventResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/events/producer/mine': {
      get: {
        tags: ['Events'],
        summary: 'Get my events',
        description: 'Get events created by current producer',
        operationId: 'getProducerEvents',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Producer events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/tickets/mine': {
      get: {
        tags: ['Tickets'],
        summary: 'Get my tickets',
        description: 'Get all tickets owned by current user',
        operationId: 'getMyTickets',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Ticket' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/tickets/history': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket history',
        description: 'Get ticket purchase and transfer history',
        operationId: 'getTicketHistory',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Ticket history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          action: { type: 'string', enum: ['purchased', 'transferred', 'received'] },
                          timestamp: { type: 'string', format: 'date-time' },
                          details: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket details',
        description: 'Get detailed ticket information',
        operationId: 'getTicket',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/TicketId' },
        ],
        responses: {
          '200': {
            description: 'Ticket details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Ticket' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tickets/{id}/qr': {
      get: {
        tags: ['Tickets'],
        summary: 'Get ticket QR code',
        description: 'Get QR code for ticket check-in',
        operationId: 'getTicketQR',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/TicketId' },
        ],
        responses: {
          '200': {
            description: 'QR code data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        qrCode: { type: 'string', format: 'binary' },
                        qrData: { type: 'string', description: 'Raw QR data' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tickets/{id}/transfer': {
      post: {
        tags: ['Tickets'],
        summary: 'Initiate ticket transfer',
        description: 'Start ticket transfer process to another user',
        operationId: 'initiateTransfer',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/TicketId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['toEmail', 'toCpf', 'toName'],
                properties: {
                  toEmail: { type: 'string', format: 'email' },
                  toCpf: { type: 'string', pattern: '^\\d{11}$' },
                  toName: { type: 'string', minLength: 3, maxLength: 255 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer initiated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        transferId: { type: 'string', format: 'uuid' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tickets/transfers/{id}/confirm': {
      post: {
        tags: ['Tickets'],
        summary: 'Confirm ticket transfer',
        description: 'Confirm transfer with OTP code',
        operationId: 'confirmTransfer',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['transferId', 'otpCode'],
                properties: {
                  transferId: { type: 'string', format: 'uuid' },
                  otpCode: { type: 'string', pattern: '^\\d{6}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer confirmed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/tickets/validate-qr': {
      post: {
        tags: ['Tickets'],
        summary: 'Validate QR code',
        description: 'Validate ticket QR code (checkin operator)',
        operationId: 'validateQR',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['qrData', 'operatorId', 'deviceId', 'eventId'],
                properties: {
                  qrData: { type: 'string', minLength: 1 },
                  operatorId: { type: 'string', format: 'uuid' },
                  deviceId: { type: 'string', minLength: 1 },
                  eventId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'QR validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        valid: { type: 'boolean' },
                        message: { type: 'string' },
                        ticket: { $ref: '#/components/schemas/Ticket' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List user orders',
        description: 'Get list of user orders with filtering',
        operationId: 'getMyOrders',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/Cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'paid', 'cancelled', 'refunded'] } },
          { name: 'eventId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'User orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Order' },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order details',
        description: 'Get detailed order information',
        operationId: 'getOrderById',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/OrderId' },
        ],
        responses: {
          '200': {
            description: 'Order details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel order',
        description: 'Cancel pending order',
        operationId: 'cancelOrder',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/OrderId' },
        ],
        responses: {
          '200': {
            description: 'Order cancelled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/payments/checkout': {
      post: {
        tags: ['Payments'],
        summary: 'Initiate payment checkout',
        description: 'Create order and initiate payment',
        operationId: 'checkout',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckoutInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Checkout created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        orderId: { type: 'string', format: 'uuid' },
                        paymentUrl: { type: 'string', format: 'uri' },
                        paymentId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Asaas payment webhook',
        description: 'Webhook endpoint for Asaas payment notifications (no auth)',
        operationId: 'handleWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  event: { type: 'string', enum: ['PAYMENT_CREATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED'] },
                  payment: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Webhook received',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/checkin/validate': {
      post: {
        tags: ['Checkin'],
        summary: 'Validate QR and checkin',
        description: 'Validate ticket QR and perform checkin',
        operationId: 'validateCheckin',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['qrData', 'operatorId', 'deviceId', 'eventId'],
                properties: {
                  qrData: { type: 'string', minLength: 10 },
                  operatorId: { type: 'string', format: 'uuid' },
                  deviceId: { type: 'string', maxLength: 100 },
                  eventId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Checkin successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        ticketId: { type: 'string', format: 'uuid' },
                        holderName: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { description: 'Ticket already checked in', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/checkin/capacity/{eventId}': {
      get: {
        tags: ['Checkin'],
        summary: 'Get event capacity status',
        description: 'Get real-time capacity information',
        operationId: 'getCapacity',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Capacity status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        capacity: { type: 'integer' },
                        checkedIn: { type: 'integer' },
                        remaining: { type: 'integer' },
                        percentage: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/checkin/sync': {
      post: {
        tags: ['Checkin'],
        summary: 'Sync offline checkins',
        description: 'Synchronize offline checkins to server',
        operationId: 'syncOfflineCheckins',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'checkins'],
                properties: {
                  eventId: { type: 'string', format: 'uuid' },
                  checkins: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['qrData', 'timestamp', 'result'],
                      properties: {
                        qrData: { type: 'string' },
                        timestamp: { type: 'number' },
                        result: { type: 'string', enum: ['valid', 'invalid_hash', 'invalid_totp', 'already_used', 'offline_valid'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Checkins synced',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/producers/register': {
      post: {
        tags: ['Producers'],
        summary: 'Register as producer',
        description: 'Register user as event producer with Asaas account',
        operationId: 'registerProducer',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterProducerInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Producer registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        producerId: { type: 'string', format: 'uuid' },
                        asaasAccountId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/producers/me': {
      get: {
        tags: ['Producers'],
        summary: 'Get producer profile',
        description: 'Get current producer account information',
        operationId: 'getProducerProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Producer profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        companyName: { type: 'string' },
                        cpfCnpj: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/producers/me/financial': {
      get: {
        tags: ['Producers'],
        summary: 'Get financial summary',
        description: 'Get producer financial summary and available balance',
        operationId: 'getFinancialSummary',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Financial summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        availableBalance: { type: 'number' },
                        totalReceived: { type: 'number' },
                        totalFees: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/producers/me/withdrawal': {
      post: {
        tags: ['Producers'],
        summary: 'Request withdrawal',
        description: 'Request withdrawal to bank account',
        operationId: 'requestWithdrawal',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', minimum: 0.01 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Withdrawal requested',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/producers/me/statement': {
      get: {
        tags: ['Producers'],
        summary: 'Get financial statement',
        description: 'Get detailed financial statement',
        operationId: 'getStatement',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'dateFrom', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Financial statement',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          description: { type: 'string' },
                          amount: { type: 'number' },
                          type: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/affiliates/links': {
      post: {
        tags: ['Affiliates'],
        summary: 'Create affiliate link',
        description: 'Create new affiliate link for event',
        operationId: 'createAffiliateLink',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'commissionPercent'],
                properties: {
                  eventId: { type: 'string', format: 'uuid' },
                  commissionPercent: { type: 'number', minimum: 0, maximum: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Affiliate link created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        code: { type: 'string' },
                        url: { type: 'string', format: 'uri' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Affiliates'],
        summary: 'Get my affiliate links',
        description: 'Get all affiliate links created by user',
        operationId: 'getMyAffiliateLinks',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/Cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { $ref: '#/components/parameters/Direction' },
        ],
        responses: {
          '200': {
            description: 'Affiliate links',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              code: { type: 'string' },
                              eventId: { type: 'string', format: 'uuid' },
                              clicks: { type: 'integer' },
                              conversions: { type: 'integer' },
                              earnings: { type: 'number' },
                            },
                          },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/affiliates/dashboard': {
      get: {
        tags: ['Affiliates'],
        summary: 'Get affiliate dashboard',
        description: 'Get affiliate performance dashboard',
        operationId: 'getAffiliateDashboard',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Affiliate dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalClicks: { type: 'integer' },
                        totalConversions: { type: 'integer' },
                        totalEarnings: { type: 'number' },
                        conversionRate: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/affiliates/track/{code}': {
      get: {
        tags: ['Affiliates'],
        summary: 'Track affiliate click',
        description: 'Track affiliate link click (redirect)',
        operationId: 'trackAffiliateClick',
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string', minLength: 1 } },
        ],
        responses: {
          '302': {
            description: 'Redirect to event',
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reports/sales/{eventId}': {
      get: {
        tags: ['Reports'],
        summary: 'Get sales report',
        description: 'Get sales report for event (producer)',
        operationId: 'getSalesReport',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Sales report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalSales: { type: 'integer' },
                        totalRevenue: { type: 'number' },
                        byBatch: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              batchName: { type: 'string' },
                              sold: { type: 'integer' },
                              revenue: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reports/checkin/{eventId}': {
      get: {
        tags: ['Reports'],
        summary: 'Get checkin report',
        description: 'Get attendance report for event',
        operationId: 'getCheckinReport',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Checkin report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalSold: { type: 'integer' },
                        totalCheckedIn: { type: 'integer' },
                        checkInRate: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reports/financial/{eventId}': {
      get: {
        tags: ['Reports'],
        summary: 'Get financial report',
        description: 'Get financial report for event',
        operationId: 'getFinancialReport',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Financial report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        grossRevenue: { type: 'number' },
                        fees: { type: 'number' },
                        netRevenue: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/reports/export/{type}/{eventId}': {
      get: {
        tags: ['Reports'],
        summary: 'Export report as CSV',
        description: 'Export report in CSV format',
        operationId: 'exportReport',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['sales', 'checkin', 'financial'] } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'CSV file',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Get admin dashboard',
        description: 'Get admin dashboard data (admin only)',
        operationId: 'getAdminDashboard',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Dashboard data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalUsers: { type: 'integer' },
                        totalEvents: { type: 'integer' },
                        totalRevenue: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/admin/events': {
      get: {
        tags: ['Admin'],
        summary: 'List all events',
        description: 'List all events for moderation (admin)',
        operationId: 'adminListEvents',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'cancelled', 'finished'] } },
          { $ref: '#/components/parameters/Cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { $ref: '#/components/parameters/Direction' },
        ],
        responses: {
          '200': {
            description: 'Events list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Event' },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/admin/events/{id}/moderate': {
      patch: {
        tags: ['Admin'],
        summary: 'Moderate event',
        description: 'Approve, reject or suspend event (admin)',
        operationId: 'moderateEvent',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['approve', 'reject', 'suspend'] },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Event moderated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'List all users (admin)',
        operationId: 'adminListUsers',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['consumer', 'producer', 'admin'] } },
          { $ref: '#/components/parameters/Cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { $ref: '#/components/parameters/Direction' },
        ],
        responses: {
          '200': {
            description: 'Users list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/admin/users/{id}/manage': {
      patch: {
        tags: ['Admin'],
        summary: 'Manage user',
        description: 'Block or unblock user (admin)',
        operationId: 'manageUser',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['block', 'unblock'] },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User managed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/favorites/{eventId}/toggle': {
      post: {
        tags: ['Favorites'],
        summary: 'Toggle favorite',
        description: 'Add or remove event from favorites',
        operationId: 'toggleFavorite',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Favorite toggled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        isFavorited: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/favorites': {
      get: {
        tags: ['Favorites'],
        summary: 'Get my favorites',
        description: 'Get list of user favorite events',
        operationId: 'getMyFavorites',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/Cursor' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Favorite events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Event' },
                        },
                        pageInfo: { $ref: '#/components/schemas/PageInfo' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/favorites/{eventId}/check': {
      get: {
        tags: ['Favorites'],
        summary: 'Check if favorited',
        description: 'Check if event is in user favorites',
        operationId: 'checkFavorited',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Favorite status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        isFavorited: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/live/purchases': {
      get: {
        tags: ['Live'],
        summary: 'Get global recent purchases',
        description: 'Get recent purchases globally (social proof)',
        operationId: 'getGlobalPurchases',
        responses: {
          '200': {
            description: 'Recent purchases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          holderName: { type: 'string' },
                          eventTitle: { type: 'string' },
                          quantity: { type: 'integer' },
                          timestamp: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/purchases/{eventId}': {
      get: {
        tags: ['Live'],
        summary: 'Get event recent purchases',
        description: 'Get recent purchases for specific event',
        operationId: 'getEventPurchases',
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Event purchases',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          holderName: { type: 'string' },
                          quantity: { type: 'integer' },
                          timestamp: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/viewers/{eventId}': {
      get: {
        tags: ['Live'],
        summary: 'Get viewer count',
        description: 'Get real-time viewer count for event',
        operationId: 'getEventViewerCount',
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Viewer count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        viewerCount: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/live/stats/{eventId}': {
      get: {
        tags: ['Live'],
        summary: 'Get live stats',
        description: 'Get combined live statistics (purchases, viewers, capacity)',
        operationId: 'getEventLiveStats',
        parameters: [
          { $ref: '#/components/parameters/EventId' },
        ],
        responses: {
          '200': {
            description: 'Live statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        viewerCount: { type: 'integer' },
                        recentPurchases: { type: 'integer' },
                        capacity: { type: 'integer' },
                        remaining: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Verifica se a aplicação está pronta para receber tráfego (DB + Redis ok). Use em Kubernetes readiness probe.',
        operationId: 'healthReady',
        responses: {
          '200': { description: 'App pronta' },
          '503': { description: 'Dependência degradada — não roteie tráfego' },
        },
      },
    },
    '/health/full': {
      get: {
        tags: ['Health'],
        summary: 'Health profundo',
        description: 'Health check completo: DB, Redis, filas BullMQ e circuit breakers. Mais caro que /ready — use em dashboards e alertas.',
        operationId: 'healthFull',
        responses: {
          '200': { description: 'Todos os checks ok ou apenas degraded' },
          '503': { description: 'Pelo menos um check falhou (status: down)' },
        },
      },
    },
    '/health/db': {
      get: {
        tags: ['Health'],
        summary: 'Health do banco de dados',
        operationId: 'healthDb',
        responses: { '200': { description: 'OK' }, '503': { description: 'DB inacessível' } },
      },
    },
    '/health/redis': {
      get: {
        tags: ['Health'],
        summary: 'Health do Redis',
        operationId: 'healthRedis',
        responses: { '200': { description: 'OK' }, '503': { description: 'Redis inacessível' } },
      },
    },
    '/health/queues': {
      get: {
        tags: ['Health'],
        summary: 'Health das filas BullMQ',
        operationId: 'healthQueues',
        responses: { '200': { description: 'Filas saudáveis' }, '503': { description: 'Falha em alguma fila' } },
      },
    },
    '/metrics': {
      get: {
        tags: ['Metrics'],
        summary: 'Prometheus metrics',
        description: 'Exposição no formato Prometheus 0.0.4 (text/plain). Sem auth — restringir via network policy.',
        operationId: 'metrics',
        responses: {
          '200': {
            description: 'Métricas no formato exposition',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/users/me/data': {
      get: {
        tags: ['LGPD'],
        summary: 'Exportar dados do usuário (LGPD art. 18 IV)',
        description: 'Retorna JSON com todos os dados pessoais do usuário (perfil, pedidos, ingressos). Limite: 3 chamadas/h.',
        operationId: 'lgpdExportData',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Dados exportados em JSON' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { description: 'Rate limit LGPD excedido' },
        },
      },
    },
    '/users/me': {
      delete: {
        tags: ['LGPD'],
        summary: 'Apagar conta (LGPD art. 18 VI)',
        description: 'Anonimiza email, CPF, nome, telefone, push token, IP e userAgent em pedidos/ingressos. Dados financeiros são preservados por 5 anos (art. 174 CTN). Limite: 3 chamadas/h.',
        operationId: 'lgpdDeleteAccount',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', description: 'Senha atual para confirmação' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Conta anonimizada com sucesso' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { description: 'Rate limit LGPD excedido' },
        },
      },
    },
    '/webhooks/external/sympla': {
      post: {
        tags: ['Webhooks External'],
        summary: 'Webhook receiver Sympla',
        description: 'Recebe eventos do Sympla (ORDER_APPROVED, ORDER_CANCELED, ORDER_REFUNDED, CHECKIN_CREATED). Validação HMAC SHA256 via header X-Signature quando EXTERNAL_WEBHOOK_SECRET está configurado. Idempotência por order_id (TTL 24h).',
        operationId: 'webhookSympla',
        responses: {
          '202': { description: 'Webhook aceito e enfileirado' },
          '200': { description: 'Duplicado — já processado nas últimas 24h' },
          '401': { description: 'Assinatura inválida' },
          '422': { description: 'Payload inválido' },
        },
      },
    },
    '/webhooks/external/ingresso': {
      post: {
        tags: ['Webhooks External'],
        summary: 'Webhook receiver Ingresso.com',
        description: 'Recebe eventos do Ingresso.com (order.paid, order.canceled, checkin.scanned). Validação HMAC e idempotência idênticas ao Sympla.',
        operationId: 'webhookIngresso',
        responses: {
          '202': { description: 'Webhook aceito' },
          '200': { description: 'Duplicado' },
          '401': { description: 'Assinatura inválida' },
          '422': { description: 'Payload inválido' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token (Authorization: Bearer <token>)',
      },
      optionalBearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Optional JWT Bearer token',
      },
    },
    parameters: {
      EventId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Event ID',
      },
      TicketId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Ticket ID',
      },
      OrderId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Order ID',
      },
      Cursor: {
        name: 'cursor',
        in: 'query',
        schema: { type: 'string', format: 'uuid' },
        description: 'Cursor for pagination',
      },
      Limit: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of items per page',
      },
      Direction: {
        name: 'direction',
        in: 'query',
        schema: { type: 'string', enum: ['forward', 'backward'], default: 'forward' },
        description: 'Pagination direction',
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      TooManyRequests: {
        description: 'Too many requests',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'Invalid request data' },
              details: { type: 'object' },
            },
          },
        },
      },
      PageInfo: {
        type: 'object',
        properties: {
          nextCursor: { type: 'string', format: 'uuid', nullable: true },
          prevCursor: { type: 'string', format: 'uuid', nullable: true },
          hasMore: { type: 'boolean' },
          total: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          cpf: { type: 'string' },
          phone: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', format: 'uri', nullable: true },
          role: { type: 'string', enum: ['consumer', 'producer', 'admin'] },
          emailVerified: { type: 'boolean' },
          twoFactorEnabled: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/components/schemas/User' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          shortDescription: { type: 'string' },
          category: { type: 'string', enum: ['MUSIC', 'SPORTS', 'THEATER', 'CINEMA', 'OTHER'] },
          coverImageUrl: { type: 'string', format: 'uri' },
          venueName: { type: 'string' },
          venueAddress: { type: 'string' },
          venueLat: { type: 'number', nullable: true },
          venueLng: { type: 'number', nullable: true },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['draft', 'published', 'cancelled', 'finished'] },
          ageRating: { type: 'string' },
          isOpenBar: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      EventResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/components/schemas/Event' },
        },
      },
      Batch: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          priceCents: { type: 'integer' },
          quantity: { type: 'integer' },
          sold: { type: 'integer' },
          available: { type: 'integer' },
          type: { type: 'string', enum: ['regular', 'vip', 'premium'] },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CreateEventInput: {
        type: 'object',
        required: ['title', 'description', 'shortDescription', 'category', 'venueName', 'venueAddress', 'venueCapacity', 'startsAt', 'endsAt', 'coverImageUrl', 'batches'],
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 255 },
          description: { type: 'string', minLength: 10, maxLength: 5000 },
          shortDescription: { type: 'string', minLength: 10, maxLength: 500 },
          category: { type: 'string', enum: ['MUSIC', 'SPORTS', 'THEATER', 'CINEMA', 'OTHER'] },
          venueName: { type: 'string', minLength: 3, maxLength: 255 },
          venueAddress: { type: 'string', minLength: 5, maxLength: 500 },
          venueLat: { type: 'number', minimum: -90, maximum: 90 },
          venueLng: { type: 'number', minimum: -180, maximum: 180 },
          venueCapacity: { type: 'integer', minimum: 1 },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          doorsOpenAt: { type: 'string', format: 'date-time' },
          coverImageUrl: { type: 'string', format: 'uri', maxLength: 500 },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          ageRating: { type: 'string', maxLength: 10, default: 'Livre' },
          dressCode: { type: 'string', maxLength: 100 },
          isOpenBar: { type: 'boolean', default: false },
          lineup: { type: 'array', items: { type: 'string' } },
          rules: { type: 'string', maxLength: 2000 },
          maxTicketsPerCpf: { type: 'integer', minimum: 1, default: 4 },
          batches: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                priceCents: { type: 'integer', minimum: 0 },
                quantity: { type: 'integer', minimum: 1 },
                type: { type: 'string', enum: ['regular', 'vip', 'premium'], default: 'regular' },
                startsAt: { type: 'string', format: 'date-time' },
                endsAt: { type: 'string', format: 'date-time' },
                autoSwitch: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      UpdateEventInput: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 3, maxLength: 255 },
          description: { type: 'string', minLength: 10, maxLength: 5000 },
          shortDescription: { type: 'string', minLength: 10, maxLength: 500 },
          category: { type: 'string', enum: ['MUSIC', 'SPORTS', 'THEATER', 'CINEMA', 'OTHER'] },
          venueName: { type: 'string', minLength: 3, maxLength: 255 },
          venueAddress: { type: 'string', minLength: 5, maxLength: 500 },
          venueLat: { type: 'number', minimum: -90, maximum: 90 },
          venueLng: { type: 'number', minimum: -180, maximum: 180 },
          venueCapacity: { type: 'integer', minimum: 1 },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          coverImageUrl: { type: 'string', format: 'uri' },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderId: { type: 'string', format: 'uuid' },
          eventId: { type: 'string', format: 'uuid' },
          batchId: { type: 'string', format: 'uuid' },
          holderName: { type: 'string' },
          holderCpf: { type: 'string' },
          holderEmail: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['valid', 'used', 'transferred', 'cancelled'] },
          qrCode: { type: 'string' },
          usedAt: { type: 'string', format: 'date-time', nullable: true },
          transferredAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          eventId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'paid', 'cancelled', 'refunded'] },
          totalCents: { type: 'integer' },
          feeCents: { type: 'integer' },
          paymentMethod: { type: 'string', enum: ['pix', 'credit_card', 'boleto'] },
          paymentId: { type: 'string', nullable: true },
          ticketCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CheckoutItem: {
        type: 'object',
        required: ['batchId', 'quantity', 'holderName', 'holderCpf'],
        properties: {
          batchId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 50 },
          holderName: { type: 'string', minLength: 3, maxLength: 255 },
          holderCpf: { type: 'string', pattern: '^\\d{11}$' },
        },
      },
      CheckoutInput: {
        type: 'object',
        required: ['eventId', 'items', 'paymentMethod'],
        properties: {
          eventId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: { $ref: '#/components/schemas/CheckoutItem' },
          },
          paymentMethod: { type: 'string', enum: ['pix', 'credit_card', 'boleto'] },
          couponCode: { type: 'string', maxLength: 50 },
          affiliateCode: { type: 'string', maxLength: 50 },
          deviceFingerprint: { type: 'string', maxLength: 255 },
        },
      },
      RegisterProducerInput: {
        type: 'object',
        required: ['companyName', 'companyType', 'address', 'addressNumber', 'province', 'city', 'postalCode', 'incomeValue'],
        properties: {
          companyName: { type: 'string', minLength: 3, maxLength: 255 },
          cpfCnpj: { type: 'string', pattern: '^\\d{11,14}$' },
          companyType: { type: 'string', enum: ['MEI', 'ME', 'EPP', 'LTDA', 'SA', 'INDIVIDUAL'] },
          email: { type: 'string', format: 'email' },
          mobilePhone: { type: 'string', pattern: '^\\d{10,11}$' },
          phone: { type: 'string', pattern: '^\\d{10,11}$' },
          address: { type: 'string', minLength: 3, maxLength: 255 },
          addressNumber: { type: 'string', maxLength: 10 },
          complement: { type: 'string', maxLength: 255 },
          province: { type: 'string', minLength: 3, maxLength: 100 },
          city: { type: 'string', minLength: 3, maxLength: 100 },
          state: { type: 'string', pattern: '^[A-Z]{2}$' },
          postalCode: { type: 'string', pattern: '^\\d{8}$' },
          incomeValue: { type: 'number', minimum: 0 },
          birthDate: { type: 'string', format: 'date' },
          site: { type: 'string', format: 'uri' },
          bankAccount: {
            type: 'object',
            properties: {
              bankCode: { type: 'string', pattern: '^\\d{3}$' },
              branchCode: { type: 'string', maxLength: 8 },
              accountNumber: { type: 'string', maxLength: 20 },
              accountType: { type: 'string', enum: ['CHECKING', 'SAVINGS'] },
              accountHolder: { type: 'string', maxLength: 255 },
            },
          },
        },
      },
    },
  },
};

/**
 * Setup Swagger UI for OpenAPI documentation
 * Mounts at /api/docs
 */
export function setupSwagger(app: Express): void {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Ticketeria API Documentation',
    }),
  );
}

export default openApiSpec;

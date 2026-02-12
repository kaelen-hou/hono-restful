type OpenApiDocument = {
  openapi: '3.1.0'
  info: {
    title: string
    version: string
    description: string
  }
  servers: Array<{ url: string }>
  tags: Array<{ name: string; description: string }>
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http'
        scheme: 'bearer'
        bearerFormat: 'JWT'
      }
    }
    schemas: Record<string, unknown>
  }
  paths: Record<string, unknown>
}

const schemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
      requestId: { type: 'string' },
    },
    required: ['code', 'message', 'requestId'],
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'user'] },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
    required: ['id', 'email', 'role'],
  },
  AuthTokens: {
    type: 'object',
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
    },
    required: ['accessToken', 'refreshToken'],
  },
  Todo: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      userId: { type: 'integer' },
      title: { type: 'string' },
      completed: { type: 'boolean' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
    required: ['id', 'userId', 'title', 'completed', 'createdAt', 'updatedAt'],
  },
}

const pathItemWithError = (item: Record<string, unknown>): Record<string, unknown> => {
  return {
    ...item,
    responses: {
      ...(item.responses as Record<string, unknown>),
      400: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      500: {
        description: 'Internal error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  }
}

export const createOpenApiDocument = (requestUrl: string): OpenApiDocument => {
  const origin = new URL(requestUrl).origin

  return {
    openapi: '3.1.0',
    info: {
      title: 'Hono Todo API',
      version: '1.0.0',
      description: 'REST API for todo and auth workflows on Cloudflare Workers',
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'system', description: 'System endpoints' },
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'todo', description: 'Todo endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas,
    },
    paths: {
      '/': {
        get: {
          tags: ['system'],
          summary: 'Service metadata',
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
      '/health': {
        get: {
          tags: ['system'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
      '/ready': {
        get: pathItemWithError({
          tags: ['system'],
          summary: 'Readiness check',
          responses: {
            200: {
              description: 'Ready',
            },
          },
        }),
      },
      '/auth/register': {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Register user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/AuthTokens' },
                      {
                        type: 'object',
                        properties: { user: { $ref: '#/components/schemas/User' } },
                        required: ['user'],
                      },
                    ],
                  },
                },
              },
            },
            409: {
              description: 'Conflict',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        }),
      },
      '/auth/login': {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/AuthTokens' },
                      {
                        type: 'object',
                        properties: { user: { $ref: '#/components/schemas/User' } },
                        required: ['user'],
                      },
                    ],
                  },
                },
              },
            },
          },
        }),
      },
      '/auth/refresh': {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Refresh token pair',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string' } },
                  required: ['refreshToken'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthTokens' },
                },
              },
            },
          },
        }),
      },
      '/auth/logout': {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Revoke refresh token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string' } },
                  required: ['refreshToken'],
                },
              },
            },
          },
          responses: {
            204: { description: 'No content' },
          },
        }),
      },
      '/auth/me': {
        get: pathItemWithError({
          tags: ['auth'],
          summary: 'Current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/User' } },
                    required: ['user'],
                  },
                },
              },
            },
          },
        }),
      },
      '/todos': {
        get: pathItemWithError({
          tags: ['todo'],
          summary: 'List todos',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
            },
          },
        }),
        post: pathItemWithError({
          tags: ['todo'],
          summary: 'Create todo',
          security: [{ bearerAuth: [] }],
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
          },
        }),
      },
      '/todos/{id}': {
        get: pathItemWithError({
          tags: ['todo'],
          summary: 'Get todo by id',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
            404: {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        }),
        put: pathItemWithError({
          tags: ['todo'],
          summary: 'Replace todo',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
          },
        }),
        patch: pathItemWithError({
          tags: ['todo'],
          summary: 'Patch todo',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Todo' },
                },
              },
            },
          },
        }),
        delete: pathItemWithError({
          tags: ['todo'],
          summary: 'Delete todo',
          security: [{ bearerAuth: [] }],
          responses: {
            204: { description: 'No content' },
          },
        }),
      },
    },
  }
}

export const createDocsHtml = (openApiUrl: string): string => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hono Todo API Docs</title>
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url="${openApiUrl}"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`
}

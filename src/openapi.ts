import { z } from 'zod'
import { API_PREFIX } from '@/constants/api'
import { loginBodySchema, refreshBodySchema, registerBodySchema } from '@/features/auth/schemas'
import { createTodoBodySchema, patchTodoBodySchema, putTodoBodySchema } from '@/lib/schemas/todo'

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

const userResponseSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const authTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

const todoResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

function toOpenApiSchema(
  schema: z.ZodType,
  io: 'input' | 'output' = 'input',
): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
  }) as Record<string, unknown>
  // The internal "~standard" metadata is not part of OpenAPI schema object.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { '~standard': _standard, ...openApiSchema } = jsonSchema
  return openApiSchema
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
  User: toOpenApiSchema(userResponseSchema, 'output'),
  AuthTokens: toOpenApiSchema(authTokensResponseSchema, 'output'),
  Todo: toOpenApiSchema(todoResponseSchema, 'output'),
}

const registerBodyOpenApiSchema = toOpenApiSchema(registerBodySchema)
const loginBodyOpenApiSchema = toOpenApiSchema(loginBodySchema)
const refreshBodyOpenApiSchema = toOpenApiSchema(refreshBodySchema)
const createTodoBodyOpenApiSchema = toOpenApiSchema(createTodoBodySchema)
const putTodoBodyOpenApiSchema = toOpenApiSchema(putTodoBodySchema)
const patchTodoBodyOpenApiSchema = toOpenApiSchema(patchTodoBodySchema)

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
      [API_PREFIX]: {
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
      [`${API_PREFIX}/health`]: {
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
      [`${API_PREFIX}/ready`]: {
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
      [`${API_PREFIX}/auth/register`]: {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Register user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: registerBodyOpenApiSchema,
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
      [`${API_PREFIX}/auth/login`]: {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: loginBodyOpenApiSchema,
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
      [`${API_PREFIX}/auth/refresh`]: {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Refresh token pair',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: refreshBodyOpenApiSchema,
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
      [`${API_PREFIX}/auth/logout`]: {
        post: pathItemWithError({
          tags: ['auth'],
          summary: 'Revoke refresh token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: refreshBodyOpenApiSchema,
              },
            },
          },
          responses: {
            204: { description: 'No content' },
          },
        }),
      },
      [`${API_PREFIX}/auth/me`]: {
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
      [`${API_PREFIX}/todos`]: {
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
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: createTodoBodyOpenApiSchema,
              },
            },
          },
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
      [`${API_PREFIX}/todos/{id}`]: {
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
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: putTodoBodyOpenApiSchema,
              },
            },
          },
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
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: patchTodoBodyOpenApiSchema,
              },
            },
          },
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

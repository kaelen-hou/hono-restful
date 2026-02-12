import { Hono } from 'hono'
import { requireAuth } from '../lib/auth-middleware'
import {
  createTodoBodySchema,
  listTodosQuerySchema,
  patchTodoBodySchema,
  putTodoBodySchema,
  todoIdParamSchema,
} from '../lib/schemas/todo'
import { validate } from '../lib/validation'
import { createTodoRepositoryFromEnv } from '../repositories/todo-repository-factory'
import { createTodoService } from '../services/todo-service'
import type { AppEnv } from '../types/env'
import type { PatchTodoInput } from '../types/todo'

export const todoRoutes = new Hono<AppEnv>()

todoRoutes.use('*', requireAuth)

todoRoutes.use('*', async (c, next) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  c.set('todoService', createTodoService(repository))
  await next()
})

todoRoutes.get('/todos', validate('query', listTodosQuerySchema), async (c) => {
  const service = c.get('todoService')
  const currentUser = c.get('currentUser')
  const rawQuery = c.req.valid('query')
  const query =
    rawQuery.userId === undefined
      ? { limit: rawQuery.limit, offset: rawQuery.offset }
      : { limit: rawQuery.limit, offset: rawQuery.offset, userId: rawQuery.userId }
  const result = await service.listTodos(query, currentUser)
  return c.json(result)
})

todoRoutes.get('/todos/:id', validate('param', todoIdParamSchema), async (c) => {
  const service = c.get('todoService')
  const currentUser = c.get('currentUser')
  const { id } = c.req.valid('param')
  const todo = await service.getTodoById(id, currentUser)
  return c.json(todo)
})

todoRoutes.post('/todos', validate('json', createTodoBodySchema), async (c) => {
  const service = c.get('todoService')
  const currentUser = c.get('currentUser')
  const input = c.req.valid('json')
  const todo = await service.createTodo(input, currentUser)
  return c.json(todo, 201)
})

todoRoutes.put(
  '/todos/:id',
  validate('param', todoIdParamSchema),
  validate('json', putTodoBodySchema),
  async (c) => {
    const service = c.get('todoService')
    const currentUser = c.get('currentUser')
    const { id } = c.req.valid('param')
    const input = c.req.valid('json')
    const todo = await service.replaceTodo(id, input, currentUser)
    return c.json(todo)
  },
)

todoRoutes.patch(
  '/todos/:id',
  validate('param', todoIdParamSchema),
  validate('json', patchTodoBodySchema),
  async (c) => {
    const service = c.get('todoService')
    const currentUser = c.get('currentUser')
    const { id } = c.req.valid('param')
    const rawInput = c.req.valid('json')
    const input: PatchTodoInput = {}
    if (rawInput.title !== undefined) {
      input.title = rawInput.title
    }
    if (rawInput.completed !== undefined) {
      input.completed = rawInput.completed
    }
    const todo = await service.patchTodo(id, input, currentUser)
    return c.json(todo)
  },
)

todoRoutes.delete('/todos/:id', validate('param', todoIdParamSchema), async (c) => {
  const service = c.get('todoService')
  const currentUser = c.get('currentUser')
  const { id } = c.req.valid('param')
  await service.deleteTodo(id, currentUser)
  return c.body(null, 204)
})

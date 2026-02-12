import { Hono } from 'hono'
import {
  parseCreateTodoInput,
  parseId,
  parseListTodosQuery,
  parsePatchTodoInput,
  parsePutTodoInput,
} from '../lib/validators'
import { createTodoRepositoryFromEnv } from '../repositories/todo-repository-factory'
import { createTodoService } from '../services/todo-service'
import type { AppEnv } from '../types/env'

export const todoRoutes = new Hono<AppEnv>()

todoRoutes.get('/todos', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const query = parseListTodosQuery(c.req.raw)
  const result = await service.listTodos(query)
  return c.json(result)
})

todoRoutes.get('/todos/:id', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const id = parseId(c.req.param('id'))
  const todo = await service.getTodoById(id)
  return c.json(todo)
})

todoRoutes.post('/todos', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const input = await parseCreateTodoInput(c.req.raw)
  const todo = await service.createTodo(input)
  return c.json(todo, 201)
})

todoRoutes.put('/todos/:id', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const id = parseId(c.req.param('id'))
  const input = await parsePutTodoInput(c.req.raw)
  const todo = await service.replaceTodo(id, input)
  return c.json(todo)
})

todoRoutes.patch('/todos/:id', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const id = parseId(c.req.param('id'))
  const input = await parsePatchTodoInput(c.req.raw)
  const todo = await service.patchTodo(id, input)
  return c.json(todo)
})

todoRoutes.delete('/todos/:id', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const id = parseId(c.req.param('id'))
  await service.deleteTodo(id)
  return c.body(null, 204)
})

import { Hono } from 'hono'
import { parseCreateTodoInput, parseId, parseUpdateTodoInput } from '../lib/validators'
import { createTodoRepositoryFromEnv } from '../repositories/todo-repository-factory'
import { createTodoService } from '../services/todo-service'
import type { AppEnv } from '../types/env'

export const todoRoutes = new Hono<AppEnv>()

todoRoutes.get('/todos', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const todos = await service.listTodos()
  return c.json(todos)
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
  const input = await parseUpdateTodoInput(c.req.raw)
  const todo = await service.updateTodo(id, input)
  return c.json(todo)
})

todoRoutes.delete('/todos/:id', async (c) => {
  const repository = createTodoRepositoryFromEnv(c.env)
  const service = createTodoService(repository)
  const id = parseId(c.req.param('id'))
  await service.deleteTodo(id)
  return c.body(null, 204)
})

import { Hono } from 'hono'

interface Bindings {
  DB: D1Database
}

type TodoRow = {
  id: number
  title: string
  completed: number
  created_at: string
  updated_at: string
}

type Todo = {
  id: number
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

const app = new Hono<{ Bindings: Bindings }>()

const mapTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  completed: row.completed === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

app.get('/', (c) => c.json({ service: 'todo-api', status: 'ok' }))

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.get('/todos', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, completed, created_at, updated_at FROM todos ORDER BY id DESC',
  ).all<TodoRow>()

  return c.json(results.map(mapTodo))
})

app.get('/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: 'invalid id' }, 400)
  }

  const row = await c.env.DB.prepare(
    'SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = ?',
  )
    .bind(id)
    .first<TodoRow>()

  if (!row) {
    return c.json({ error: 'todo not found' }, 404)
  }

  return c.json(mapTodo(row))
})

app.post('/todos', async (c) => {
  const body = await c.req.json<{ title?: string; completed?: boolean }>().catch(() => null)
  const title = body?.title?.trim()

  if (!title) {
    return c.json({ error: 'title is required' }, 400)
  }

  const completed = body?.completed === true ? 1 : 0

  const result = await c.env.DB.prepare('INSERT INTO todos (title, completed) VALUES (?, ?)')
    .bind(title, completed)
    .run()

  const created = await c.env.DB.prepare(
    'SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = ?',
  )
    .bind(result.meta.last_row_id)
    .first<TodoRow>()

  if (!created) {
    return c.json({ error: 'failed to fetch created todo' }, 500)
  }

  return c.json(mapTodo(created), 201)
})

app.put('/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: 'invalid id' }, 400)
  }

  const body = await c.req
    .json<{ title?: string; completed?: boolean }>()
    .catch(() => null)

  if (!body || (body.title === undefined && body.completed === undefined)) {
    return c.json({ error: 'title or completed is required' }, 400)
  }

  const updates: string[] = []
  const values: Array<string | number> = []

  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) {
      return c.json({ error: 'title cannot be empty' }, 400)
    }
    updates.push('title = ?')
    values.push(title)
  }

  if (body.completed !== undefined) {
    updates.push('completed = ?')
    values.push(body.completed ? 1 : 0)
  }

  const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`
  values.push(id)

  const result = await c.env.DB.prepare(sql)
    .bind(...values)
    .run()

  if (!result.success || (result.meta.changes ?? 0) === 0) {
    return c.json({ error: 'todo not found' }, 404)
  }

  const updated = await c.env.DB.prepare(
    'SELECT id, title, completed, created_at, updated_at FROM todos WHERE id = ?',
  )
    .bind(id)
    .first<TodoRow>()

  if (!updated) {
    return c.json({ error: 'failed to fetch updated todo' }, 500)
  }

  return c.json(mapTodo(updated))
})

app.delete('/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: 'invalid id' }, 400)
  }

  const result = await c.env.DB.prepare('DELETE FROM todos WHERE id = ?')
    .bind(id)
    .run()

  if (!result.success || (result.meta.changes ?? 0) === 0) {
    return c.json({ error: 'todo not found' }, 404)
  }

  return c.body(null, 204)
})

export default app

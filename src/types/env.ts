export type Bindings = {
  DB?: D1Database
  DB_DRIVER?: 'd1' | 'memory'
}

export type AppEnv = {
  Bindings: Bindings
}

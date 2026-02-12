export type Bindings = {
  DB?: D1Database
  DB_DRIVER?: 'd1' | 'memory'
  APP_ENV?: 'development' | 'staging' | 'production'
}

export type AppVariables = {
  requestId: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: AppVariables
}

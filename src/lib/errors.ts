export type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR'

export class ApiError extends Error {
  status: ApiErrorStatus
  code: ApiErrorCode

  constructor(status: ApiErrorStatus, code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

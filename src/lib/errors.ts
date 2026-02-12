export type ApiErrorStatus = 400 | 404 | 500 | 503

export type ApiErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFIG_ERROR' | 'INTERNAL_ERROR'

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

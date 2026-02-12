type ApiErrorStatus = 400 | 404 | 500

export class ApiError extends Error {
  status: ApiErrorStatus

  constructor(status: ApiErrorStatus, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

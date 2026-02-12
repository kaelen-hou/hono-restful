# Observability Guide

## 1. Structured Logs

This project emits JSON logs in three categories:

- `request`: request access log
- `metric_http_request`: metric event per request
- `api_error` / `unhandled_error`: application error logs
- `auth_*` audit logs (for register/login/refresh/logout)

Core fields:

- `requestId`
- `method`
- `path`
- `status`
- `durationMs`
- `latencyBucket`
- `errorCode` (if exists)
- `userId` (if authenticated)

## 2. Metrics Semantics

`metric_http_request` is generated for every request.

Latency buckets:

- `lt_50ms`
- `50_100ms`
- `100_300ms`
- `300ms_1s`
- `gte_1s`

Recommended dashboard dimensions:

- By route: `path + method`
- By status class: `2xx/4xx/5xx`
- By `errorCode`

Recommended SLI:

- Request success ratio (`2xx / total`)
- P95 latency by route
- 5xx ratio
- Auth failure ratio (`UNAUTHORIZED / auth endpoints`)

## 3. Alert Suggestions

Start with simple threshold alerts:

1. Availability
- Trigger when 5xx ratio > 2% in 5 minutes

2. Latency
- Trigger when p95 latency > 500ms in 10 minutes

3. Auth anomaly
- Trigger when `auth_login_failed` spikes 3x above baseline

4. Dependency readiness
- Trigger when `/ready` fails for 3 consecutive checks

## 4. Incident Triage

When an issue occurs:

1. Check `/health` then `/ready`.
2. Filter logs by `requestId` or `errorCode`.
3. Confirm whether issue is:
- auth/session (`UNAUTHORIZED`)
- validation (`BAD_REQUEST`)
- config/dependency (`CONFIG_ERROR` / `INTERNAL_ERROR`)
4. If needed, run `smoke.sh` against production domain for fast regression check.

## 5. Security Notes for Logs

- Do not log passwords or raw tokens.
- Keep email in audit logs masked.
- Keep stack traces only for `unhandled_error`.

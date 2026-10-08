# Soy-Dee API

RESTful JSON API for the Health Tracking Web App, per `API_SPEC.md`. Go + MySQL, chi router.

## Setup

1. Copy `.env.example` to `.env` and fill in DB credentials and `JWT_SECRET`.
2. Create an empty database (`CREATE DATABASE soydee CHARACTER SET utf8mb4;`), then apply migrations:
   ```
   make migrate-up        # or: go run ./cmd/migrate up
   ```
   Existing database that was migrated by hand before the runner? Run once: `go run ./cmd/migrate baseline 5`.
   Other commands: `status`, `down` (reverts the last migration). New migration = `NNNN_name.up.sql` + `NNNN_name.down.sql`.
3. Create at least one admin row in `system_data` (password must be a bcrypt hash — there's no
   self-service admin registration endpoint by design):
   ```sql
   INSERT INTO system_data (sys_username, sys_password) VALUES ('admin', '<bcrypt-hash>');
   ```
4. Run:
   ```
   make run               # or: go run ./cmd/api
   ```
   `make test`, `make vet`, `make build` also available; CI (`.github/workflows/ci.yml`) runs fmt-check, vet, test, build.
   Health check: `GET /healthz`. API contract: `docs/openapi.yaml`.

Server listens on `:8080` by default (`APP_PORT` in `.env`), all routes under `/api/v1`.
Uploaded avatars are served from `/uploads/avatars/...`.

## Layout

Standard `cmd/` + `internal/` layout: `config` → `database` → `models` → `repositories` →
`services` → `handlers` → `routes` (`domain` holds pure business rules such as BMR; handlers never touch repositories directly). See `API_SPEC.md` for the endpoint contract each handler
implements.

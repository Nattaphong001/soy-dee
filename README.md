# Soy-Dee API

RESTful JSON API for the Health Tracking Web App, per `API_SPEC.md`. Go + MySQL, chi router.

## Setup

1. Copy `.env.example` to `.env` and fill in DB credentials and `JWT_SECRET`.
2. Create the database and load the schema:
   ```
   mysql -u root -p < internal/database/migrations/0001_init.sql
   ```
3. Create at least one admin row in `system_data` (password must be a bcrypt hash — there's no
   self-service admin registration endpoint by design):
   ```sql
   INSERT INTO system_data (sys_username, sys_password) VALUES ('admin', '<bcrypt-hash>');
   ```
4. Run:
   ```
   go run ./cmd/api
   ```

Server listens on `:8080` by default (`APP_PORT` in `.env`), all routes under `/api/v1`.
Uploaded avatars are served from `/uploads/avatars/...`.

## Layout

Standard `cmd/` + `internal/` layout: `config` → `database` → `models` → `repositories` →
`services` → `handlers` → `routes`. See `API_SPEC.md` for the endpoint contract each handler
implements.

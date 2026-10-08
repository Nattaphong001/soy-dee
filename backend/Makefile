.PHONY: run build test vet fmt migrate-up migrate-down migrate-status

run:
	go run ./cmd/api

build:
	go build -o bin/soydee-api ./cmd/api
	go build -o bin/migrate ./cmd/migrate

test:
	go test ./...

vet:
	go vet ./...

fmt:
	go fmt ./...

migrate-status:
	go run ./cmd/migrate status

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

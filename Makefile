# Makefile — atajos para levantar, probar y auditar Exiros.
# El detalle paso a paso vive en README.md; esto es el "rápido".
# `make` o `make help` lista todo. Requiere: Node + npm, Docker, (Java 21 para Android).

DC := docker compose -f infra/docker-compose.yml
API_URL ?= http://localhost:3000

.DEFAULT_GOAL := help
.PHONY: help install env db-up db-down db-reset db-wait migrate seed build setup \
        backend web lint test check health android-debug clean

help: ## Lista los comandos disponibles
	@echo "Exiros — atajos (make <target>):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependencias (backend + web)
	cd backend && npm install
	cd web && npm install

env: ## Crea backend/.env desde el ejemplo si no existe (no lo pisa)
	@if [ -f backend/.env ]; then echo "backend/.env ya existe (no se toca)"; \
		else cp backend/.env.example backend/.env && echo "Creado backend/.env (revisa los secretos)"; fi

db-up: ## Levanta Postgres (Docker)
	$(DC) up -d

db-down: ## Detiene Postgres (conserva los datos)
	$(DC) down

db-reset: ## Borra y recrea Postgres VACIO (pierde datos!)
	$(DC) down -v
	$(DC) up -d

db-wait: ## Espera a que Postgres acepte conexiones
	@echo "Esperando Postgres..."
	@until docker exec exiros-postgres pg_isready -U exiros >/dev/null 2>&1; do sleep 1; done
	@echo "Postgres listo."

migrate: ## Genera el cliente Prisma + aplica migraciones
	cd backend && npx prisma generate && npx prisma migrate deploy

seed: ## Siembra el admin (admin@exiros.com / admin1234)
	cd backend && npx prisma db seed

build: ## Compila backend y web
	cd backend && npm run build
	cd web && npm run build

setup: install env db-up db-wait migrate seed build ## CERO a listo: instala, BD, migra, siembra, compila
	@echo ""
	@echo "Listo. Ahora en 2 terminales:  make backend  |  make web"
	@echo "Recuerda: crea 1-2 destinos en el portal o la app no podra crear viajes."

backend: ## Corre la API en :3000 (foreground)
	cd backend && npm run start:prod

web: ## Corre el portal en :5173 (foreground)
	cd web && npm run dev

lint: ## Lint de backend + web (puro, sin --fix)
	cd backend && npm run lint
	cd web && npm run lint

test: ## Tests backend (unit + e2e; requiere Postgres arriba)
	cd backend && npm test && npm run test:e2e

check: lint build test ## Todos los gates (lint + build + test) — lo que mira la rubrica
	@echo "Gates verdes."

health: ## Consulta GET /api/health
	@curl -s $(API_URL)/api/health || echo "(sin backend en $(API_URL))"

android-debug: ## Compila el APK debug (requiere Android SDK + Java 21)
	cd android && JAVA_HOME=$$(/usr/libexec/java_home -v 21) ./gradlew assembleDebug

clean: db-down ## Detiene Postgres y borra los build (dist)
	rm -rf backend/dist web/dist

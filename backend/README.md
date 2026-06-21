# backend — API NestJS + Prisma

Monolito modular NestJS (ADR-002) con Prisma sobre PostgreSQL (ADR-005/006).
Una sola API: rutas `/api/web/*` (Guard JWT) y `/api/mobile/*` (Guard tripToken).

## Requisitos
- Postgres corriendo: `docker compose -f ../infra/docker-compose.yml up -d`
- `backend/.env` con `DATABASE_URL` (ver `.env.example`).

## Comandos
```bash
npm install                 # dependencias
npx prisma migrate deploy   # aplica migraciones (crea tablas)
npx prisma generate         # genera el cliente Prisma
npm run start:dev           # API en http://localhost:3000 (watch)
npm run build               # compila a dist/
```

## Gates de calidad (verde antes de cada commit)
```bash
npm run lint && npm run build && npm test
```

## Notas
- **Prisma fijado a 6.x** (Prisma 7 rompe `url` en schema y exige driver adapters — ver
  `CONTEXT-AI.md`). El modelo de datos vive en `docs/database-spec.md §10` (fuente de verdad).
- El **índice parcial RN-11** (1 viaje `EN_RUTA` por `deviceId`) va como SQL crudo dentro de
  la migración inicial (Prisma no lo expresa en el schema).
- El cliente generado cae en `generated/` (gitignoreado).

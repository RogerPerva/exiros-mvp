# Etapa 1: build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
# Genera el cliente de Prisma para producción
RUN npx prisma generate

# Etapa 2: imagen de producción (sin devDependencies ni código fuente)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar artefactos de build y schema de Prisma (necesario para migraciones)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Directorio de uploads (fotos de viajes)
RUN mkdir -p uploads

EXPOSE 3000

# Corre migraciones pendientes y luego arranca el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
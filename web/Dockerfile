# Etapa 1: build de React
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# VITE_API_URL se inyecta en build-time como arg (la URL del backend)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: nginx sirve los archivos estáticos
FROM nginx:1.27-alpine AS runner

# Config de nginx: sirve SPA y reenvía /api al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

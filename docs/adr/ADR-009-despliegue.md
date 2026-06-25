# ADR-009 — Despliegue (D2)

- **Estado:** ✅ Aceptado (2026-06-18; **revisado 2026-06-25** → deploy real en AWS EC2 + RDS + cloudflared)
- **Decide:** cómo el dispositivo (emulador/teléfono) alcanza el backend en desarrollo y en la demo.

## Contexto
El dispositivo necesita un backend **alcanzable por internet**. El doc dice que el **cloud NO es requisito** (no está prohibido, solo no obligatorio). Riesgo a evitar: que la **demo dependa de la laptop + red local**.

## Decisión
**Desarrollo con túnel; demo desplegada en AWS (free tier).**
- **Desarrollo:** backend local + **túnel (cloudflared, `scripts/tunnel.sh`)** para que el dispositivo lo alcance.
- **Demo (2026-06-25):** backend NestJS en **AWS EC2 (free tier)** + **RDS PostgreSQL** administrado; **cloudflared corriendo en el mismo EC2** para la URL **HTTPS** pública (no hay dominio propio) → URL estable, independiente de la laptop.
  - ⚠️ **HTTPS obligatorio:** el APK release **bloquea HTTP en claro** (`usesCleartextTraffic` solo en el manifest debug); por eso la URL del APK debe ser `https://…` (la da cloudflared).
  - ⚠️ **Rate-limit detrás del túnel:** tras cloudflared el backend ve `127.0.0.1` como IP de todo el tráfico → poner **`TRUST_PROXY_IP=true`** para que el `ProxyThrottlerGuard` use la IP real (`CF-Connecting-IP`). Ver ADR-007.
- **Web:** build estático (Vite) con `VITE_API_URL` apuntando a la URL del EC2.
- **Fotos:** volumen local del backend (MVP, ver stack).

## Alternativas consideradas
- **Solo túnel (sin deploy):** la URL `trycloudflare.com` cambia en cada arranque y la demo depende de la laptop encendida. Sirve para dev; en la demo se prefiere el EC2.
- **Railway/Render (free):** considerado en la decisión original (2026-06-18); se cambió a **AWS EC2 + RDS** (2026-06-25) por control de infra y porque encaja en el free tier sin pagar ALB.
- **ALB de AWS + ACM (TLS):** descartado: **no es free tier** (~$16/mes). Por eso el TLS lo da cloudflared, gratis.
- **Cloud formal / Kubernetes / CD:** sobreingeniería; el proyecto los marca como no requeridos.

## Consecuencias
**Positivas:** demo robusta y portable con URL HTTPS estable; el teléfono físico usa GPS real contra un backend de internet.
**Negativas:** setup de EC2 + RDS + cloudflared (una vez); secretos del `.env` a gestionar en el servidor (ver `infra/secrets.local.env`).

## Riesgos y reversibilidad
- **Free tier:** límites de EC2/RDS; usar instancias t3.micro/db.t3.micro y AZ única (evitar NAT gateway, que sí cuesta).
- **cloudflared efímero:** la URL `trycloudflare.com` cambia al reiniciar; recompilar el APK si cambia. Reversible a túnel local (`scripts/tunnel.sh`) sin tocar código.

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * ThrottlerGuard que rastrea por la IP REAL del cliente cuando el backend corre detrás de
 * un proxy de confianza (cloudflared/Cloudflare en el EC2). Sin esto, `req.ip` sería
 * `127.0.0.1` para TODO el tráfico → el rate-limit por IP se vuelve un cubo compartido
 * (un atacante lo agota para todos) y no distingue al abusador.
 *
 * SEGURIDAD: las cabeceras `CF-Connecting-IP`/`X-Forwarded-For` son falsificables por el
 * cliente. Solo se confían cuando `TRUST_PROXY_IP=true` (entornos donde Cloudflare las
 * reescribe). En dev / acceso directo el flag va apagado → se usa `req.ip` (sin spoofing).
 */
interface TrackedRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@Injectable()
export class ProxyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const { ip, headers } = req as TrackedRequest;
    if (process.env.TRUST_PROXY_IP === 'true' && headers) {
      const cf = headers['cf-connecting-ip'];
      if (typeof cf === 'string' && cf) return Promise.resolve(cf);
      const xff = headers['x-forwarded-for'];
      if (typeof xff === 'string' && xff) {
        return Promise.resolve(xff.split(',')[0].trim());
      }
    }
    return Promise.resolve(ip ?? 'unknown');
  }
}

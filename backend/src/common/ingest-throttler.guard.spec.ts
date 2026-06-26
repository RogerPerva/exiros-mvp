import { ingestTracker } from './ingest-throttler.guard';

describe('ingestTracker (H-3: rate-limit de ingesta por tripToken)', () => {
  it('keyea por el id del viaje resuelto por el tripToken', () => {
    expect(ingestTracker({ trip: { id: 'trip-123' }, ip: '1.2.3.4' })).toBe(
      'ingest:trip:trip-123',
    );
  });

  it('dos tokens (viajes) distintos caen en cubos distintos aunque compartan IP', () => {
    const a = ingestTracker({ trip: { id: 'A' }, ip: '9.9.9.9' });
    const b = ingestTracker({ trip: { id: 'B' }, ip: '9.9.9.9' });
    expect(a).not.toBe(b);
  });

  it('sin viaje resuelto cae a la IP (defensa residual)', () => {
    expect(ingestTracker({ ip: '5.6.7.8' })).toBe('ingest:ip:5.6.7.8');
    expect(ingestTracker({})).toBe('ingest:ip:unknown');
  });
});

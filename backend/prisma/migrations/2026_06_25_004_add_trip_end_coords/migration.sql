-- Punto de cierre: última coordenada guardada al cerrar el viaje (manual o por geocerca).
ALTER TABLE "Trip" ADD COLUMN "endLat" DOUBLE PRECISION,
                   ADD COLUMN "endLng" DOUBLE PRECISION;

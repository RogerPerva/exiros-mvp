-- Quita el valor SUPER_ADMIN del enum Role (vuelta a 2 roles: ADMIN, MONITOR).
-- Postgres no permite DROP de un valor de enum → recrear el tipo.
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MONITOR');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MONITOR';
COMMIT;

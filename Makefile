.PHONY: get-version

# Versiones fijadas del stack, para levantar el entorno igual que en desarrollo.
get-version:
	@echo "commit:      $$(git describe --always --dirty --tags)"
	@echo "node:        22-alpine (ver backend/Dockerfile, web/Dockerfile)"
	@echo "postgres:    16-alpine (ver devops/docker-compose.yml)"
	@echo "backend:"
	@echo "  @nestjs/core:   $$(node -p "require('./backend/package.json').dependencies['@nestjs/core']")"
	@echo "  prisma:         $$(node -p "require('./backend/package.json').devDependencies.prisma")"
	@echo "  @prisma/client: $$(node -p "require('./backend/package.json').dependencies['@prisma/client']")"
	@echo "  typescript:     $$(node -p "require('./backend/package.json').devDependencies.typescript")"
	@echo "web:"
	@echo "  react:          $$(node -p "require('./web/package.json').dependencies.react")"
	@echo "  vite:           $$(node -p "require('./web/package.json').devDependencies.vite")"
	@echo "  typescript:     $$(node -p "require('./web/package.json').devDependencies.typescript")"

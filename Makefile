.PHONY: get-version build

get-version:
	@git describe --always --dirty --tags

build:
	docker compose -f devops/docker-compose.yml build

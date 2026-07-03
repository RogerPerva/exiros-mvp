.PHONY: get-version build

get-version:
	@jq -r '.version' ./package.json

build:
	docker compose -f devops/docker-compose.yml build

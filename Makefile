release:
	@test -n "$(v)" || (echo "Usage: make release v=0.1.0" && exit 1)
	npm version $(v)
	git push
	git push origin v$$(node -p "require('./package.json').version")
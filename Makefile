.PHONY: setup build publish dev

setup:
	npm install

dev:
	npm run dev

build:
	npm run build

publish: build
	ssh-agent sh -c 'ssh-add && npx gh-pages -d dist'

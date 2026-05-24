# AGENTS.md

Guidance for agents working in `client-js`.

## Purpose

This package is the official JavaScript and TypeScript client for RechnungsAPI. It combines generated OpenAPI types/client artifacts with a small handwritten `Client` wrapper in `src/index.ts`.

Keep this package aligned with the public API contracts from the main `rechnungs-api` repository. For API behavior, schema, or OpenAPI source changes, check the relevant `AGENTS.md` files in `../rechnungs-api`.

## Project Shape

- `src/index.ts`: handwritten public client wrapper and exported generated types.
- `src/generated`: OpenAPI-generated code from `@hey-api/openapi-ts`.
- `README.md`: public package usage documentation.
- `package.json`: package metadata, generation scripts, and build scripts.
- `tsup.config.ts`: library build configuration.
- `biome.json`: formatting and linting configuration.

## Commands

Use Yarn in this package; it contains Yarn Plug'n'Play files and a `yarn.lock`.

```bash
yarn build
yarn generate:localhost
yarn generate:production
yarn biome check .
yarn biome format --write .
```

`yarn generate:localhost` expects the local RechnungsAPI app/API to serve `http://www.localhost/api/v1/openapi.yaml`. `yarn generate:production` uses the production OpenAPI document.

## Code Style

- TypeScript is the default language.
- Follow the local Biome configuration.
- Keep the public wrapper in `src/index.ts` small, direct, and dependency-light.
- Preserve the generated type exports from `./generated/types.gen`.
- Use native `fetch`, `URLSearchParams`, `ArrayBuffer`, and JSON primitives unless there is a strong reason to add a dependency.
- Keep API values consistent with the generated types. Monetary amounts and decimal API fields are strings.

## Generated Code

- Do not hand-edit `src/generated` unless the user explicitly asks for a temporary patch.
- Prefer regenerating from the OpenAPI document after API/schema changes.
- If regeneration changes many files, inspect the diff for unexpected contract changes before touching handwritten client code.
- If a needed type is missing or wrong, first check the API schemas/OpenAPI output in `../rechnungs-api`.

## Public API Expectations

- `Client` should expose ergonomic methods for stable public endpoints while preserving generated request/response types.
- Keep method names aligned with existing verbs such as `createDocument`, `readDocument`, `listLedgers`, and `createLedgerTransaction`.
- Throw `ApiError` for non-OK HTTP responses so callers can inspect status and body.
- Preserve overloads where return type depends on input, such as `readDocument`.
- Avoid breaking package exports, constructor options, or documented README examples without a clear versioning reason.

## Testing And Verification

- Run `yarn build` after TypeScript or export changes.
- Run `yarn biome check .` after formatting-sensitive edits.
- For generated code updates, run the relevant generation command and then `yarn build`.
- For README examples, keep snippets realistic and consistent with exported types.

## Things To Avoid

- Do not commit API keys, `.env` files, generated package archives, or local output documents.
- Do not change the default `baseUrl` without confirming the API deployment path.
- Do not add runtime dependencies for small helper logic that the platform already provides.
- Do not make client behavior diverge silently from the documented API contract.

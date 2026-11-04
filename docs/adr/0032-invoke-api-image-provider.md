# ADR 0032: Opt-in invoke-API image provider

Date: 2026-11-05
Status: Accepted
PR: [#62](https://github.com/Mokie04/Presentation-Maker-101/pull/62)

## Context

The app generates slide pictures through an OpenAI-compatible `/images/generations` endpoint. A second image service is reached through a different shape: `POST {base}/model/{model-id}/invoke` with a bearer key, a JSON prompt body and a JSON reply holding base64 images.

## Decision

- `IMAGE_PROVIDER_KIND` selects the adapter. The default, `openai-compatible`, keeps today's behaviour exactly. `invoke-api` selects the new adapter in `src/lib/providers/image/invoke-api.ts`.
- With `invoke-api`, `IMAGE_PROVIDER_BASE_URL` (https only), `IMAGE_PROVIDER_API_KEY` and `IMAGE_PROVIDER_MODEL` must all be set. The OpenAI-compatible defaults would send the key to the wrong host, so none are assumed.
- The request sends the same prompt prefix, `aspect_ratio` (`IMAGE_PROVIDER_ASPECT_RATIO`, default 16:9) and `output_format: png`.
- It reuses `boundedFetch` for the deadline, the 12 MB response cap and no redirects.
- Retries follow the existing policy: 4xx other than 429 stop at once; 429, 5xx and network errors retry up to three times.
- Error messages carry only the HTTP status. Response bodies are never copied, because services can echo credentials.
- A refused or empty image is an error, so `auto` mode still falls back to Pexels.
- The image health check is configuration-only, so it is unchanged.

## Consequences

- Production is unchanged until the variables are set.
- A key set in the environment is the only credential. It should be scoped to one image model and rotated like any provider key.
- A model that needs an input image cannot be used: the adapter sends a prompt only.

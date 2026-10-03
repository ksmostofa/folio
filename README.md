# Folio

A source-first form checklist workbench for Hack Apertus track 2B. Folio extracts instructions from numbered source pages, rejects quotes that do not match their cited page, retains conditional wording, and lets a person review original text beside translation drafts. It exports a checklist and a portable evidence ledger.

The opening document is fictional. It is not municipal guidance. No live model call occurs in demo mode. A working prototype does not imply any predicted chance of winning.

## Run

Requires Node 24+.

```sh
npm install
npm run dev
```

For the optional live model path, build and start the API/static server:

```sh
npm run build
node server.mjs
```

Open http://127.0.0.1:4174. The server supplies `/api/status` and `/api/compile`. Demo mode works without any credentials or server. Vite development needs a same-origin `/api` proxy to the local API server if live mode is desired.

## Configure Apertus

Set server environment variables using the endpoint and model ID supplied by your authorized provider or local deployment. Folio does not assume that a public Apertus endpoint, credentials, or a particular model ID exists.

```sh
export OPENAI_BASE_URL=https://YOUR_PROVIDER/OPENAI_COMPATIBLE_BASE
export APERTUS_MODEL=YOUR_ACTUAL_APERTUS_MODEL_ID
export APERTUS_API_KEY=YOUR_SERVER_ONLY_KEY
node server.mjs
```

The server appends `/chat/completions` to `OPENAI_BASE_URL`. Do not put the complete chat completion route in that variable. A local OpenAI-compatible model server can use HTTP on localhost with `APERTUS_ALLOW_LOCAL=1` when it does not require a key. External HTTP, URLs containing credentials and cross-origin browser requests are rejected. No API keys reach the browser. Binding defaults to `127.0.0.1`; use an authenticated deployment gateway before exposing live requests publicly. This prototype has no multiuser login, quota or rate limiter.

Actual Apertus hosting, quantization and hardware sizing remain deployment work. The response records the configured model, measured response duration, and reported input/output token counts when the provider supplies them. No cost estimate is invented.

## Review flow

1. Load the fictional sample or import a `.txt`/`.md` document below 150 KB. A source can contain up to 50,000 characters. Put `---PAGE---` on its own line to number pages.
2. Select a reading language and extraction mode. Demo extraction recognizes English lines starting with Bring, Submit, Send, Keep, or an `If ... bring` condition. Demo Japanese and French translations exist only for sample sentences. Other texts may correctly produce no items.
3. Compile. Live mode sends the source to the configured endpoint. Model JSON must contain original quotes, pages and requirement types.
4. Inspect the original page for each quote, assess conditional applicability and review translation drafts. Check an item when you have reviewed it.
5. Export the text checklist or evidence JSON. JSON includes the full source, so handle the exported file with the same care as the imported document.

Saving is explicit and uses browser localStorage. Clear saved document removes Folio's stored document in that browser. Clearing cannot delete previously downloaded files or data already sent to a live provider.

## What validation proves

The validator checks exact quote membership in a numbered page, complete sentence/line boundaries, allowed requirement types, duplicate citations and output limits. The checklist displays the source quote itself rather than a model-generated factual claim. Every condition in that quoted sentence stays visible.

A quote match does not certify source authenticity, current validity, correct type classification, applicability, extraction completeness or translation accuracy. The validator intentionally fails closed on unmatched quotes. It cannot stop an authentic-looking source from containing false information. Human review remains part of the product.

## Verification

```sh
node --test tests/*.test.mjs
npm run build
```

`tests/compiler.test.mjs` covers 28 deterministic cases, including invented quotes, page mismatches, date mutation, removed conditional clauses, duplicate quotes, invalid output, unsupported demo languages and evidence exports. `tests/fixtures/citation-cases.json` supplies 24 multilingual synthetic fixtures, tested with exact and wrong-page citations. Two local mock-endpoint tests verify fail-closed configuration and validated proxy output. All 78 tests pass. These tests do not measure Apertus accuracy. Live Apertus quality, cost and latency must be measured separately before submission.

## Submission readiness

See [docs/submission.md](docs/submission.md) for the rubric mapping, demo storyboard, remaining work and links to the official event. This prototype focuses on an auditable workflow rather than a generic legal chatbot.

## UI and licenses

The UI uses the requested shadcn Luma preset `b1VlJBjs` and selected RareUI components, with semantic HTML for layout. UI source and dependencies keep their upstream licenses. Application code is Apache-2.0. Original docs are CC-BY-4.0. Synthetic benchmark data is CDLA-Permissive-2.0. Those licenses do not relicense imported user documents, third-party UI or externally hosted model weights. See `LICENSE`, `docs/LICENSE`, `tests/fixtures/LICENSE` and `THIRD_PARTY_NOTICES.md`.

## Component credits

[shadcn/ui](https://ui.shadcn.com) uses its MIT license. [Rare UI](https://rareui.com) components retain MIT + Commons Clause + Attribution. See `licenses/rare-ui.txt`.

**Submission blocker:** Rare UI's Commons Clause has not been cleared against Hack Apertus's Apache-2.0-compatible output terms. Obtain organizer clearance before submission. Original application licensing does not relicense the copied UI components.

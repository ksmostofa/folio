# Folio

[Open the working demo](https://ksmostofa.github.io/folio/). [Public source repository](https://github.com/ksmostofa/folio).

The public demo runs in the browser. Folio's live Apertus adapter runs separately with `npm start`; Pages does not host that server.

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

Open http://127.0.0.1:4174. The server supplies `/api/status` and `/api/compile`. Demo mode works without any credentials or server. The Vite development configuration already proxies same-origin `/api` calls to port 4174; run `npm start` alongside `npm run dev` for live mode.

## Configure Apertus

Set server environment variables using the endpoint and model ID supplied by your authorized provider or local deployment. Folio does not assume that a public Apertus endpoint, credentials, or a particular model ID exists.

```sh
export OPENAI_BASE_URL=https://YOUR_PROVIDER/OPENAI_COMPATIBLE_BASE
export APERTUS_MODEL=YOUR_ACTUAL_APERTUS_MODEL_ID
export APERTUS_API_KEY=YOUR_SERVER_ONLY_KEY
node server.mjs
```

The server appends `/chat/completions` to `OPENAI_BASE_URL`. Do not put the complete chat completion route in that variable. A local OpenAI-compatible model server can use HTTP on localhost with `APERTUS_ALLOW_LOCAL=1` when it does not require a key. External HTTP, URLs containing credentials and cross-origin browser requests are rejected. No API keys reach the browser. Binding defaults to `127.0.0.1`; use an authenticated deployment gateway before exposing live requests publicly. The local server caps live compilations at two concurrent calls, rejects oversized model responses and cancels upstream requests when the client disconnects. It has no multiuser login or per-user billing quota; keep it behind an authenticated gateway before public use.

Actual Apertus hosting, quantization and hardware sizing remain deployment work. The response records the configured model, measured response duration, and reported input/output token counts when the provider supplies them. No cost estimate is invented.

## Review flow

1. Load the fictional sample or import a `.txt`/`.md` document below 150 KB. A source can contain up to 50,000 characters. Put `---PAGE---` on its own line to number pages.
2. Select a reading language and extraction mode. Demo extraction recognizes English lines starting with Bring, Submit, Send, Keep, or an `If ... bring` condition. Demo Japanese and French translations exist only for sample sentences. Other texts may correctly produce no items.
3. Compile. Live mode sends the source to the configured endpoint. Model JSON must contain original quotes, pages and requirement types.
4. Inspect the original page for each quote, assess conditional applicability and review translation drafts. Check an item when you have reviewed it.
5. Export the text checklist or evidence JSON. JSON includes the full source, so handle the exported file with the same care as the imported document.

Each instruction has a human applicability decision and a review note. To mark an item reviewed, first open its source citation and choose 'Applies to me' or 'Not applicable'. A 'Not applicable' decision also requires a nonblank explanation. Returning to 'Needs review' or removing that explanation clears the checked state. The same gate runs when restoring saved progress; older checkpoints without citation-open records retain notes but clear checked items. These decisions do not claim that the model assessed your circumstances.

Saving is explicit and uses browser localStorage for the source, cited checklist, checked items, applicability decisions and notes. A review checkpoint can be exported and re-imported; Folio revalidates every saved quote and rejects any source mismatch. Imported model metadata is clearly marked as unverified. JSON checkpoint imports can be up to 2 MB, while text imports stay below 150 KB. Clear saved document removes Folio's stored document in that browser. Clearing cannot delete previously downloaded files or data already sent to a live provider.

## What validation proves

The validator checks exact quote membership in a numbered page, complete sentence/line boundaries, allowed requirement types, duplicate citations and output limits. The checklist displays the source quote itself rather than a model-generated factual claim. Every condition in that quoted sentence stays visible.

A quote match does not certify source authenticity, current validity, correct type classification, applicability, extraction completeness or translation accuracy. The validator intentionally fails closed on unmatched quotes. It cannot stop an authentic-looking source from containing false information. Human review remains part of the product.

## Verification

```sh
node --test tests/*.test.mjs
npm run build
```

`tests/compiler.test.mjs` covers 30 deterministic cases, including invented quotes, page mismatches, date mutation, removed conditional clauses, duplicate quotes, invalid output, unsupported demo languages and evidence exports. `tests/fixtures/citation-cases.json` supplies 24 multilingual synthetic fixtures, tested with exact and wrong-page citations. Four local mock-endpoint tests verify fail-closed configuration, validated proxy output, response bounds and concurrency limits. Review checkpoint tests cover round-trip state, forged pages, edited source, invalid review decisions and unknown IDs. API tests verify bounded responses and two-call concurrency limits. All 104 tests pass. These tests do not measure Apertus accuracy. Live Apertus quality, cost and latency must be measured separately before submission.

## Real Apertus access

The official [event resources](https://hackapertus.devpost.com/resources) provide CSCS inference for all teams. Redeem the team endpoint/key through the organizer guide first. The separately listed CSCS compute allocation is for Swiss academic teams. No event credentials are present here.

The alternative documented Public AI base URL is `https://api.publicai.co/v1` with example model `swiss-ai/apertus-v1.5-8b`. A personal API key is required. Current provider docs state $2 starter credit, not unlimited free inference. Folio sends the required identifying User-Agent. After configuring your own authorized key, `node scripts/check-endpoint.mjs` verifies model discovery without making an inference call. With a `.env` file, Node 24 supports `node --env-file=.env scripts/check-endpoint.mjs` and `node --env-file=.env server.mjs`.

See [docs/research/apertus-access.md](docs/research/apertus-access.md) for primary sources, local hardware assessment and exact outstanding access/license blockers. No actual Apertus inference has run in this session.

## Reproducible real-model evaluation

`tests/fixtures/extraction-gold.json` has 25 synthetic gold cases across several languages, including abstention and embedded instruction attacks. Once your local API is genuinely configured, run:

```sh
node scripts/evaluate.mjs tests/fixtures/extraction-gold.json folio-evaluation.json
```

The runner calls the actual configured model through the local server, records exact quote/type/page precision and recall, tokens and duration, and checkpoints results after every case. It stops on the first API error without retries. The output explicitly identifies synthetic data and does not evaluate translation quality. No real model evaluation report exists yet. Runner tests use mock endpoints and do not count as Apertus results.

The GitHub Pages workflow builds a static demo. Citation inspection, reviewer decisions, saves and exports work there, while live mode stays disabled when `/api/status` is unavailable. The optional backend runs through `npm start`.

## Submission readiness

See [docs/submission.md](docs/submission.md) for the rubric mapping, demo storyboard, remaining work and links to the official event. This prototype focuses on an auditable workflow rather than a generic legal chatbot.

## UI and licenses

The UI uses the requested shadcn Luma preset `b1VlJBjs` and selected RareUI components, with semantic HTML for layout. UI source and dependencies keep their upstream licenses. Application code is Apache-2.0. Original docs are CC-BY-4.0. Synthetic benchmark data is CDLA-Permissive-2.0. Those licenses do not relicense imported user documents, third-party UI or externally hosted model weights. See `LICENSE`, `docs/LICENSE`, `tests/fixtures/LICENSE` and `THIRD_PARTY_NOTICES.md`.

## Component credits

[shadcn/ui](https://ui.shadcn.com) uses its MIT license. [Rare UI](https://rareui.com) components use the exact plain-MIT upstream snapshot `c9a745c9cc04376f5a1abbd62d5fae9ea589944b`. Full copyright and permission notice is retained in `licenses/rare-ui.txt`; source hashes and license history are in [docs/rareui-provenance.md](docs/rareui-provenance.md). Current registry copies have different terms and are not used.

The earlier Rare UI component-license blocker is resolved by using verified historical MIT-licensed copies. Original application licensing does not relicense other dependencies.

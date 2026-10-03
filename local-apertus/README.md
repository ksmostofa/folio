# Local Apertus experiment

Real inference with the public official `swiss-ai/Apertus-v1.1-0.5B-Instruct` checkpoint. This is a bounded compatibility and quality experiment, not a demonstrated successful Folio extraction model.

## Verified source and access

- [Official Apertus Mini announcement](https://apertus-ai.org/articles/2026-06-apertus-mini/).
- [Official model card](https://huggingface.co/swiss-ai/Apertus-v1.1-0.5B-Instruct): Apache-2.0, native Transformers support, CPU usage documented.
- [Pinned official file tree](https://huggingface.co/swiss-ai/Apertus-v1.1-0.5B-Instruct/tree/a140fd61fb57422c36a26301caea17edee799874).
- Public, ungated metadata and unauthenticated downloads verified. No account, keys, paid calls, third-party weights, custom model code, or CUDA installation.
- Exact revision: `a140fd61fb57422c36a26301caea17edee799874`. Weights 1,145,165,288 bytes; downloaded model files total 1,162,440,246 bytes. SHA-256 values and official LFS comparisons are in `model-manifest.json`.
- Event eligibility is unresolved. The published event description references Apertus v1.5; this experiment uses Mini v1.1. Do not claim that this model satisfies the event until the actual track instructions confirm it.

## Reproduce

Python 3.12 and Node 24 are required for the evaluated configuration. Keep this directory either next to the `folio` checkout or inside it. For another layout, supply `--folio-root /absolute/path/to/folio` to evaluation and API smoke commands.

```sh
python -m venv .venv
.venv/bin/python -m pip install 'torch==2.14.1+cpu' --index-url https://download.pytorch.org/whl/cpu
.venv/bin/python -m pip install -r requirements-lock.txt
.venv/bin/python download_model.py
.venv/bin/python evaluate.py --limit 5 --output baseline-five.json
.venv/bin/python evaluate.py --limit 5 --adapted --output experimental-five.json
.venv/bin/python smoke_api.py
```

The downloader pins the official revision, enforces a 2 GB declared-file budget, bounds each file to its declared length and verifies available official LFS SHA-256 values. It downloads safetensors rather than executable pickle weights. `local_files_only=True` and `trust_remote_code=False` prevent runtime remote code or additional downloads. Model files and the Python environment are ignored by Git.

## Measured result

Measurements on 2026-10-03, AMD EPYC 9V74 CPU, nine visible logical CPUs, approximately 10 GB total RAM, four Torch threads, float32, greedy decoding, cache enabled, PyTorch 2.14.1+cpu, Transformers 4.57.6. Initialization was approximately 0.7 seconds once files were downloaded. Evaluation was in-process using the same runtime as the HTTP adapter. Each fixture was evaluated once per explicitly separate prompt experiment.

| Experiment | Cases | Correct exact extractions | False accepted extractions | Misses | JSON/items-array parse errors | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Exact current Folio prompt | 5 | 0 | 0 | 5 | 0 | All five candidate items rejected for unknown requirement type |
| Separate simpler few-shot prompt | 5 | 0 | 1 | 5 | 4 | Four malformed JSON responses; one deadline classified as document |

Baseline wall time per fixture was 5.2–6.4 seconds, about 7.5–8.0 generated tokens/second. The model echoed the schema's literal `document|deadline|step` string. Baseline extraction recall is 0%; precision is undefined because no item survived validation. These are five simple synthetic English cases. They do not estimate multilingual or real-world accuracy. The adapted experiment also has 0% recall and 0% precision; its one false accepted item shows that exact citation checks alone do not prove semantic classification.

`baseline-five.json` and `experimental-five.json` retain raw generated text, actual token counts, generation duration, prompt/dataset hashes, exact matches and rejection reasons. `smoke-evaluation.json` preserves the initial inference and the subsequently fixed Node stdin harness error. It must not be counted as a model schema failure. No failed response is repaired, replaced with a mock, or omitted from a completed experiment.

The runtime logs a Transformers warning concerning the tokenizer regex and a CPU xIELU fallback message. We preserved the official tokenizer unchanged; no undocumented tokenizer modification or external CUDA extension was installed. The warning is an additional reproducibility limitation rather than a basis for assuming a better score.

## Folio adapter

```sh
.venv/bin/python server.py --port 8765
```

In a separate terminal in the same network namespace:

```sh
OPENAI_BASE_URL=http://127.0.0.1:8765/v1 \
APERTUS_MODEL=swiss-ai/Apertus-v1.1-0.5B-Instruct \
APERTUS_ALLOW_LOCAL=1 \
node server.mjs
```

This serves `/v1/models`, nonstreaming `/v1/chat/completions`, and `/health`, exclusively on loopback. It exposes the actual model ID and token usage; no fallback model exists. It requires temperature 0, rejects a wrong model ID or direct browser Origin, permits one CPU generation at a time, caps request bodies at 240 KB, context at 4096 tokens and output at 1024 tokens, and requests a 55-second generation time limit. Generation time limits can end between decoding steps; Folio retains its separate 60-second request timeout. Inputs are rejected rather than silently truncated. Longer forms and checklists can exceed this small model's capacity.

`smoke_api.py` runs both processes in one network namespace and submits the first gold fixture through the actual Folio `/api/compile` route. `api-smoke.json` records its real result. Some managed shells isolate loopback for each invocation; in that environment, start Folio and the model adapter in one invocation or process supervisor. Static GitHub Pages does not run this Python adapter or Node server.

Original adapter/evaluation code is Apache-2.0 under `LICENSE`. This documentation is CC-BY-4.0. Model weights retain their official Apache-2.0 terms. Synthetic gold fixtures originate in Folio under its fixture license; the reports are synthetic experimental artifacts, not official municipal guidance or legal advice.

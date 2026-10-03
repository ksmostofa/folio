# Folio submission plan

## Project claim

Folio turns a supplied document into a reviewable checklist. It preserves the original source wording, shows a numbered page citation, displays a translation draft beside the original, rejects citations that cannot be found, and exports the evidence. A reviewer resolves conditional instructions and missing information before acting.

The target is a repetitive task shared by municipal service counters, onboarding teams and multilingual applicants. This prototype uses a fictional workshop form; it does not claim to automate legal advice.

## Event alignment

Target: Hack Apertus, track 2B. The event and its official materials must be rechecked before submission:

- https://hackapertus.ch/
- https://hackapertus.ch/terms-and-conditions

The official [Devpost rules](https://hackapertus.devpost.com/rules) set the deadline to 16 October 2026, 12:00 CEST, which is 19:00 JST. Check the official submission portal and track terms before relying on that time.

| Criterion | Concrete demonstration | Remaining evidence |
| --- | --- | --- |
| Purposeful AI | Compile source instructions into an inspectable checklist; preserve original sentences | Test real authorized documents with actual intended users |
| Technical rigor | Fixed server-side model adapter; exact page citation checks; rejection ledger; automated adversarial tests | Run actual Apertus extraction evaluation on held-out documents |
| Value, cost and scalability | One model call per compile; measured latency and provider token usage shown in export | Compare reviewed checklist completion time; measure provider cost and concurrency |
| Sovereign deployment | OpenAI-compatible Apertus configuration; browser-local workspace; keyless localhost option | Demonstrate actual local or approved sovereign Apertus deployment and its hardware |
| Feasibility | Text import, source editing, checklist review, citation inspector and exports work | Obtain user feedback, add input format coverage and deployment access controls |

No criterion table supplies an objective probability of winning. The strongest next step is a recorded demo with an actual Apertus endpoint and an evaluation that reports errors as well as successes.

## Three-minute demo

- 0:00-0:20: Show a multilingual applicant reading a source form and missing a conditional supporting document. State that the opening source is fictional.
- 0:20-0:55: Compile using the configured Apertus model. Show model name, measured duration and reported tokens. Keep demo mode clearly labeled if endpoint access is unavailable.
- 0:55-1:30: Open the quoted condition and its full source page. Explain that translation drafts require review. Never check the conditional item automatically.
- 1:30-2:00: Show a fabricated quote failing the automated validator. Show a wrong-page quote and a removed condition being rejected.
- 2:00-2:30: Review supported items and export the evidence JSON. Show original quote, page, translation and completion state.
- 2:30-3:00: Describe a sovereign deployment configuration and the work that remains. Report measured evaluation results, not estimated model accuracy.

## Local work completed

- Source import/edit, quote-validated checklist, citation inspector and original/translation view.
- Human applicability decisions and notes for each instruction.
- Explicit local save, portable review checkpoints and citation revalidation on restore.
- Text checklist and full evidence JSON exports.
- Actual OpenAI-compatible Apertus adapter, required User-Agent, response size bound, two-call concurrency cap and connection cancellation.
- Endpoint catalog diagnostic that makes no inference request.
- 94 deterministic tests covering validator, multilingual fixtures, review restoration and proxy reliability.

## Blocking evidence

An actual authorized Apertus key/local deployment and Rare UI license clearance remain unresolved. See [research/apertus-access.md](research/apertus-access.md). These blockers cannot be fixed by calling the demo output a model result or relabeling third-party code. The held-out real-model evaluation and recorded inference demo remain pending. A 25-case synthetic gold corpus and evaluation runner are ready; no synthetic mock test is presented as an Apertus benchmark.

## Before submission

- Redeem CSCS inference access through the official [event resources](https://hackapertus.devpost.com/resources) and Getting Started guide; it is available to all teams.
- Confirm track 2B eligibility, permitted external services, team composition, presentation format and exact deadline in the official portal.
- Run the prototype against the actual Apertus model selected for the event. Capture model ID, endpoint deployment location, model license, hardware, tokens, latency and cost.
- Use consented or public sources with clear licenses. Keep private applicant documents out of a public demo and repository.
- Evaluate at least 20 held-out source forms in relevant languages. Score extraction precision/recall, full-condition retention, translation errors and human review time. The existing synthetic validator fixtures cannot establish those measurements.
- Add authentication and rate limiting before a publicly exposed live endpoint. Remove browser-local persistence if a deployment's document retention policy prohibits it.
- Record demo and submit the source repository, readme and licenses required by the official rules.

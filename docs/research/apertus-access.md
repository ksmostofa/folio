# Apertus access and licensing check

Checked 3 October 2026 against primary sources. Public pages describe access; no account was created, no existing account or secret was searched, no payment method was added, and no live inference result is claimed.

## Event-provided CSCS access

The official organizer resources page explicitly lists CSCS inference for all teams, CSCS compute for Swiss academic teams, Phoeniqs compute applications for non-academic teams, and $10 Hugging Face credit for each hacker. The first option is the preferred event route for Folio; inference is not restricted to Swiss academic teams, while the separately listed compute allocation is.

- Official resources: https://hackapertus.devpost.com/resources
- Official rules and deadline: https://hackapertus.devpost.com/rules
- Linked redemption guide: https://hackapertus.notion.site/getting-started-guide-onlinehack

The linked guide returned 404 to the research tool on this check. That does not prove the guide is unavailable in a participant browser. Obtain the actual team endpoint, model ID and key through the organizer onboarding. No team access key was supplied in this session. CSCS general academic service eligibility is a different route and should not be confused with the event allocation.

Folio accepts the team-provided OpenAI-compatible URL and model ID through the same server environment variables; use `node scripts/check-endpoint.mjs` to verify the catalog. No endpoint or entitlement is invented.

## Documented alternative API

Public AI's developer portal documents the base URL `https://api.publicai.co/v1` and example model `swiss-ai/apertus-v1.5-8b`. All requests require a personal API key and an identifying User-Agent. Folio now sends `User-Agent: Folio/1.0`.

The provider's Quick Start, last modified 26 September 2026, says a new account receives $2 of starter credit, then usage consumes credit at listed per-token prices. This is a limited credit allocation, not an anonymous or unlimited free API. The Apertus team's hackathon guide calls Public AI free for testing, but current provider billing documentation is the more precise source for cost and account requirements.

- Provider Quick Start: https://platform.publicai.co/docs
- API specification: https://platform.publicai.co/api/~endpoints
- Official Apertus hackathon access guide: https://apertus-ai.org/pages/hackathons/

The guide also lists Infomaniak, local model tools and university compute. Their presence on the page does not establish that this user has an account, grant, key or access entitlement. Folio accepts a genuine provider model ID; the catalog diagnostic checks availability before any inference call.

```sh
# After the owner independently creates a key and confirms pricing/credit:
export OPENAI_BASE_URL=https://api.publicai.co/v1
export APERTUS_MODEL=swiss-ai/apertus-v1.5-8b
export APERTUS_API_KEY=YOUR_OWN_KEY
node scripts/check-endpoint.mjs
npm start
```

No secret belongs in source code, a public repo, a browser form or a transcript. The command checks `/models`; it does not make a paid inference call. It reports only model IDs and endpoint host, never the key.

## Local inference assessment

The current execution workspace reports about 10 GB RAM, nine logical CPUs and no installed Ollama or NVIDIA utility. This is below the generous memory headroom needed for an unquantized 8B model. A quantized model might run, but it still requires a verified model source, a multigigabyte download and runtime setup. No weights or unverified binaries were downloaded. The exact memory and speed of any future quantized deployment must be measured; this assessment is not a model benchmark.

The official guide says Apertus models can be downloaded under Apache-2.0 and points to user guides and official Hugging Face releases. Model version terms and any acceptable-use conditions still need checking for the actual weights chosen.

## Rare UI and event license

The exact chosen library is https://rareui.com, backed by https://github.com/swamimalode07/rare-ui. Its actual LICENSE combines MIT wording with Commons Clause and visible attribution. It permits use inside an application but forbids selling, sublicensing or redistributing the components themselves. The source and footer now preserve its notices and attribution.

Hack Apertus terms say submitted source code and model weights use Apache-2.0, with CC-BY-4.0 for documentation/designs and CDLA-Permissive-2.0 for datasets. They also require compatible terms for pre-existing IP needed to use or develop the output. Event-specific licenses can supersede the general clause.

- Rare UI actual license: https://github.com/swamimalode07/rare-ui/blob/main/LICENSE
- Event terms, section 6: https://hackapertus.ch/terms-and-conditions

Those texts leave a material compatibility issue. Folio's Apache license cannot remove Rare UI's additional restriction. Organizer clearance or a separate compatible grant from the author is needed before treating the copied UI as compliant submission material. The instruction to keep Rare UI is honored; no unapproved replacement or relicensing was made. No organizer or author was contacted.

## Concrete remaining blockers

1. Actual Apertus inference needs the organizer-issued CSCS team credentials, an owner-provided alternative provider key or a verified local deployment. Provider starter credit may cover testing, but no key or account is available in this session.
2. Rare UI clearance against the event's output terms has not been obtained.
3. A real-model held-out evaluation and recorded demo cannot be completed honestly until item 1 is resolved. Existing validator tests and synthetic fixtures do not prove model accuracy.
4. Registration, current submission portal instructions and final submission must use the user's authorized event account. No project was submitted by this code task.

# RareUI source provenance

The three components below use the full plain-MIT license supplied by the official upstream repository at commit `c9a745c9cc04376f5a1abbd62d5fae9ea589944b`, dated 2026-09-18T00:54:49+05:30. These are exact historical source copies, not relicensed current registry copies. No local component edits or import-alias changes were needed.

- [Official source tree](https://github.com/swamimalode07/rare-ui/tree/c9a745c9cc04376f5a1abbd62d5fae9ea589944b)
- [Exact source LICENSE](https://github.com/swamimalode07/rare-ui/blob/c9a745c9cc04376f5a1abbd62d5fae9ea589944b/LICENSE)
- Full license retained locally in `licenses/rare-ui.txt`.
- Copyright (c) 2026 Swami Malode.

| Upstream path | Original SHA-256 | Local SHA-256 |
| --- | --- | --- |
| `components/ui/animated-counter.tsx` | `7913a4e43d8ad16ebac5fe4ea2413890866f14b9a0e01f7feec2b912e399906c` | `7913a4e43d8ad16ebac5fe4ea2413890866f14b9a0e01f7feec2b912e399906c` |
| `components/ui/code-block.tsx` | `2ae7d41b4cb436256913159dd0439c372403a617f4fc20d87cbece364a33873e` | `2ae7d41b4cb436256913159dd0439c372403a617f4fc20d87cbece364a33873e` |
| `components/ui/task-list.tsx` | `9038a6110902f0d944740f91e19e0bfc2cbee8a9397ba7f1f780f72ec6802657` | `9038a6110902f0d944740f91e19e0bfc2cbee8a9397ba7f1f780f72ec6802657` |

Root LICENSE SHA-256: `462930f8d54c9e96b4de326336f499dc7da70e3e5f5d9b28adedbb0080ff9ea9`.

Upstream added the full MIT LICENSE on August 26, 2026. Its September 23 commit `32b7b52aed17d16156d5b4fd02c2ec66bf1fec8f` replaced that license with Commons Clause and attribution restrictions. The selected snapshot precedes that change and includes all three files under the actual full MIT grant. No inference from README branding was used.

Imports require React, `motion/react`, `lucide-react`, `prism-react-renderer`, and the app's `@/lib/utils` helper. Those dependencies keep their own licenses. No new dependency or lockfile change was needed. Do not update these components through an unpinned registry command: recheck the supplied license before replacing the snapshot.

Visible RareUI credit remains in the application. The retained license supplies the mandatory copyright and permission notice. This provenance addresses these components, not hackathon eligibility or unrelated dependencies.

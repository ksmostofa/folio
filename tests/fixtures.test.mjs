import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { splitPages, validateCandidates } from '../src/lib/compiler.ts'
const fixtures = JSON.parse(await readFile(new URL('./fixtures/citation-cases.json', import.meta.url), 'utf8'))
for (const fixture of fixtures) {
  test(`fixture ${fixture.id}: exact source text accepted`, () => assert.equal(validateCandidates([fixture.candidate], splitPages(fixture.source)).items.length, fixture.expectedAccepted ? 1 : 0))
  test(`fixture ${fixture.id}: wrong-page candidate rejected`, () => assert.equal(validateCandidates([{ ...fixture.candidate, page: 1 }], splitPages(fixture.source)).items.length, 0))
}

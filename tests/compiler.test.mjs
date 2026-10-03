import test from 'node:test'
import assert from 'node:assert/strict'
import { splitPages, validateCandidates, compileDemo, exportChecklist, SAMPLE } from '../src/lib/compiler.ts'
const source = 'Bring a signed form.\nSubmit it by 20 November 2026.\nIf you have more than 12 seats, bring an inspection report.\n---PAGE---\nBring a floor plan.'
const pages = splitPages(source)
const item = { kind: 'document', page: 1, quote: 'Bring a signed form.' }
const invalidCases = [
  ['invented quote', { ...item, quote: 'Bring your passport.' }],
  ['wrong page', { ...item, page: 2 }],
  ['missing page', { kind: 'document', quote: item.quote }],
  ['decimal page', { ...item, page: 1.5 }],
  ['negative page', { ...item, page: -1 }],
  ['string page', { ...item, page: '1' }],
  ['missing quote', { kind: 'document', page: 1 }],
  ['short quote', { ...item, quote: 'Bring' }],
  ['unknown type', { ...item, kind: 'fee' }],
  ['null candidate', null],
  ['string candidate', item.quote],
  ['removed conditional clause', { ...item, quote: 'bring an inspection report.' }],
  ['changed case', { ...item, quote: 'bring a signed form.' }],
  ['changed date', { ...item, kind: 'deadline', quote: 'Submit it by 21 November 2026.' }],
  ['truncated noun', { ...item, quote: 'Bring a signed' }],
]
for (const [name, candidate] of invalidCases) test(`reject ${name}`, () => { const result = validateCandidates([candidate], pages); assert.equal(result.items.length, 0); assert.equal(result.rejected.length, 1) })
test('accept exact page quote', () => { const result = validateCandidates([item], pages); assert.equal(result.items.length, 1); assert.equal(result.items[0].translation, null) })
test('preserve full conditional requirement', () => { const quote = 'If you have more than 12 seats, bring an inspection report.'; assert.equal(validateCandidates([{ ...item, quote }], pages).items[0].quote, quote) })
test('find quote on second numbered page', () => assert.equal(validateCandidates([{ ...item, page: 2, quote: 'Bring a floor plan.' }], pages).items.length, 1))
test('reject duplicate quote despite new type', () => { const result = validateCandidates([item, { ...item, kind: 'step' }], pages); assert.equal(result.items.length, 1); assert.equal(result.rejected[0].reason, 'Duplicate citation.') })
test('reject invalid response container', () => assert.equal(validateCandidates({ items: [] }, pages).rejected.length, 1))
test('split form-feed pages', () => assert.deepEqual(splitPages('one\ftwo').map(p => p.number), [1, 2]))
test('preserve source characters', () => assert.equal(splitPages('  原文\n第二行  ')[0].text, '原文\n第二行'))
test('sample yields 7 source-supported actions', () => { const result = compileDemo(SAMPLE, 'ja'); assert.equal(result.items.length, 7); assert.equal(result.rejected.length, 0); assert.equal(result.items.filter(i => i.kind === 'deadline').length, 1); for (const i of result.items) assert.ok(splitPages(SAMPLE).find(p => p.number === i.page).text.includes(i.quote)) })
test('demo does not fabricate translations for new text', () => assert.equal(compileDemo('Bring a signed form.', 'ja').items[0].translation, null))
test('unknown-language demo source abstains', () => assert.equal(compileDemo('Apportez un formulaire signé.', 'ja').items.length, 0))
test('export preserves conditional source and checked state', () => { const result = compileDemo(SAMPLE, 'en'); const output = exportChecklist(result, [result.items[0].id]); assert.ok(output.includes('[x] Bring a signed application form.')); assert.ok(output.includes('If the space has more than 12 seats')); assert.ok(output.includes('[page 2]')) })
test('item count is limited', () => { const result = validateCandidates(Array(101).fill(item), pages); assert.ok(result.rejected.some(r => r.reason.includes('100-item'))); assert.equal(result.items.length, 1) })
test('translation length is limited and not treated as source proof', () => { const result = validateCandidates([{ ...item, translation: 'x'.repeat(2200) }], pages); assert.equal(result.items[0].translation.length, 2000) })

test('accept a complete sentence after punctuation and whitespace', () => { const quote='Bring a signed form.'; assert.equal(validateCandidates([{...item,quote}],splitPages(`Read the instructions. ${quote}`)).items.length,1) })
test('reject a condition removed across a line break', () => { const quote='Bring an inspection report.'; for (const separator of ['\n','\n  ']) { const source=`If you have more than 12 seats,${separator}${quote}`; assert.equal(validateCandidates([{...item,quote}],splitPages(source)).items.length,0); assert.equal(validateCandidates([{...item,quote:source}],splitPages(source)).items.length,1) } })

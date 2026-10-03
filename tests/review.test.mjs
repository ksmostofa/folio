import test from 'node:test'
import assert from 'node:assert/strict'
import { compileDemo, SAMPLE } from '../src/lib/compiler.ts'
import { completedAfterReviewChange, exportReviewedChecklist, restoreCheckpoint, reviewCompletionIssue } from '../src/lib/review.ts'
const result = compileDemo(SAMPLE, 'ja')
const valid = { format: 'folio.review.v1', source: SAMPLE, title: 'Review', language: 'ja', result, completed: ['evidence-1'], inspected: ['evidence-1', 'evidence-5'], reviews: { 'evidence-1': { applicability: 'applies', note: 'Signed form ready' }, 'evidence-5': { applicability: 'not-applicable', note: 'Only 8 seats' } } }
test('restore retains source, reviewed state and applicability notes', () => { const restored = restoreCheckpoint(valid); assert.equal(restored.result.items.length, 7); assert.deepEqual(restored.completed, ['evidence-1']); assert.equal(restored.reviews['evidence-5'].applicability, 'not-applicable'); assert.ok(restored.result.questions[1].includes('does not prove')) })
test('reject a checkpoint with a changed source quote', () => assert.equal(restoreCheckpoint({ ...valid, source: SAMPLE.replace('signed application form', 'unsigned application form') }), null))
test('reject a checkpoint with a forged page', () => assert.equal(restoreCheckpoint({ ...valid, result: { ...result, items: [{ ...result.items[0], page: 3 }] } }), null))
test('discard unknown completed item IDs', () => assert.deepEqual(restoreCheckpoint({ ...valid, completed: ['evidence-1', 'evidence-1', '__proto__', 1] }).completed, ['evidence-1']))
test('discard invalid applicability and unknown review notes', () => { const restored = restoreCheckpoint({ ...valid, reviews: { unknown: { applicability: 'applies', note: 'bad' }, 'evidence-1': { applicability: 'guess', note: 'bad' } } }); assert.deepEqual(restored.reviews, {}) })
test('limit note length', () => assert.equal(restoreCheckpoint({ ...valid, reviews: { 'evidence-1': { applicability: 'unresolved', note: 'x'.repeat(2000) } } }).reviews['evidence-1'].note.length, 1500))
test('retain empty uncompiled document without inventing a result', () => { const restored = restoreCheckpoint({ ...valid, source: '', result: null, completed: [] }); assert.equal(restored.source, ''); assert.equal(restored.result, null); assert.deepEqual(restored.reviews, {}) })
test('reject unknown format and unsupported language', () => { assert.equal(restoreCheckpoint({ ...valid, format: 'foreign' }), null); assert.equal(restoreCheckpoint({ ...valid, language: 'unknown' }), null) })
test('reject oversized document and invalid metadata', () => { assert.equal(restoreCheckpoint({ ...valid, source: 'x'.repeat(50001) }), null); assert.equal(restoreCheckpoint({ ...valid, title: 5 }), null) })

test('text export includes human applicability and notes without changing source quotes', () => { const output = exportReviewedChecklist(result, ['evidence-1'], valid.reviews); assert.ok(output.includes('[x] Bring a signed application form.')); assert.ok(output.includes('evidence-5: not-applicable')); assert.ok(output.includes('Only 8 seats')); assert.ok(output.includes('reviewer supplied')) })

test('unresolved applicability never allows a reviewed item', () => assert.ok(reviewCompletionIssue({applicability:'unresolved',note:'I wrote a note'},true)))
test('applicable instruction requires its citation to be opened', () => { assert.ok(reviewCompletionIssue({applicability:'applies',note:''},false)); assert.equal(reviewCompletionIssue({applicability:'applies',note:''},true),null) })
test('not applicable needs an explanation as well as an opened citation', () => { assert.ok(reviewCompletionIssue({applicability:'not-applicable',note:'  '},true)); assert.ok(reviewCompletionIssue({applicability:'not-applicable',note:'Only 8 seats'},false)); assert.equal(reviewCompletionIssue({applicability:'not-applicable',note:'Only 8 seats'},true),null) })
test('returning a reviewed decision to unresolved clears only that reviewed item', () => assert.deepEqual(completedAfterReviewChange('evidence-1',{applicability:'unresolved',note:'Old note'},['evidence-1','evidence-2'],['evidence-1','evidence-2']),['evidence-2']))
test('deleting a not-applicable explanation clears reviewed status', () => assert.deepEqual(completedAfterReviewChange('evidence-1',{applicability:'not-applicable',note:' '},['evidence-1'],['evidence-1']),[]))
test('an eligible review edit preserves checked status', () => assert.deepEqual(completedAfterReviewChange('evidence-1',{applicability:'applies',note:'Updated note'},['evidence-1'],['evidence-1']),['evidence-1']))
test('checkpoint cannot restore checked unresolved applicability', () => { const restored=restoreCheckpoint({...valid,reviews:{'evidence-1':{applicability:'unresolved',note:'A note does not resolve applicability'}}}); assert.deepEqual(restored.completed,[]) })
test('checkpoint cannot restore checked status without opened citation', () => assert.deepEqual(restoreCheckpoint({...valid,inspected:[]}).completed,[]))
test('checkpoint cannot restore a not-applicable item with blank explanation', () => assert.deepEqual(restoreCheckpoint({...valid,reviews:{'evidence-1':{applicability:'not-applicable',note:' '}}}).completed,[]))
test('legacy checkpoints without opened-citation state retain notes but clear completion', () => { const {inspected: _inspected,...legacy}=valid;const restored=restoreCheckpoint(legacy);assert.deepEqual(restored.completed,[]);assert.equal(restored.reviews['evidence-1'].note,'Signed form ready');assert.deepEqual(restored.inspected,[]) })

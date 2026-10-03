// Calls the locally configured Folio API with synthetic sources. No retries or automatic payments.
import { readFile, writeFile } from 'node:fs/promises'
const suppliedBase = process.env.FOLIO_EVAL_BASE_URL || 'http://127.0.0.1:4174'
const base = new URL(suppliedBase)
if (base.username || base.password || base.search || base.hash || !['127.0.0.1','localhost','[::1]'].includes(base.hostname) || base.protocol !== 'http:') throw new Error('Evaluation accepts a localhost Folio server only.')
const fixturePath = process.argv[2]
const outputPath = process.argv[3]
if (!fixturePath || !outputPath) { console.error('Usage: node scripts/evaluate.mjs FIXTURES.json REPORT.json'); process.exit(1) }
const fixtures = JSON.parse(await readFile(fixturePath,'utf8'))
if (!Array.isArray(fixtures) || fixtures.length > 100 || fixtures.some(f => typeof f.source !== 'string' || !Array.isArray(f.expected))) throw new Error('Expected up to 100 fixtures with source, language and expected quote/page/kind items.')
const status = await fetch(new URL('/api/status',base),{signal:AbortSignal.timeout(5000)}).then(r=>r.json())
if (!status.ready) { console.error(`No inference run: ${status.reason}`); process.exit(1) }
function summary(results) { const valid=results.filter(r=>!r.error);const tp=valid.reduce((n,r)=>n+r.truePositives,0);const fp=valid.reduce((n,r)=>n+r.falsePositives,0);const fn=valid.reduce((n,r)=>n+r.falseNegatives,0);return {completed:results.length,errors:results.length-valid.length,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null} }
const results=[]
for (const fixture of fixtures) {
 const started=Date.now()
 try {
  const response=await fetch(new URL('/api/compile',base),{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(65000),body:JSON.stringify({source:fixture.source,language:fixture.language||'en'})})
  const data=await response.json()
  if(!response.ok) throw new Error(data.error||`HTTP ${response.status}`)
  const key=item=>JSON.stringify([item.page,item.kind,item.quote])
  const expected=new Set(fixture.expected.map(key));const actual=new Set(data.items.map(key));const matches=[...actual].filter(item=>expected.has(item)).length
  results.push({id:fixture.id,model:data.model,expected:expected.size,accepted:actual.size,truePositives:matches,falsePositives:actual.size-matches,falseNegatives:expected.size-matches,rejected:data.rejected.length,elapsedMs:Date.now()-started,usage:data.usage,items:data.items})
 } catch(error) {results.push({id:fixture.id,error:error.message,elapsedMs:Date.now()-started})}
 // Checkpoint real results as obtained, so an interrupted evaluation is not erased.
 await writeFile(outputPath,JSON.stringify({format:'folio.evaluation.v1',measuredAt:new Date().toISOString(),dataset:fixturePath,synthetic:true,completed:results.length,total:fixtures.length,model:status.model,summary:summary(results),results,limitations:['Exact extraction metrics only; translations and source authenticity require separate human assessment.','Synthetic fixtures do not establish real-world accuracy.']},null,2)+'\n')
 if(results.at(-1).error) {console.error(`Stopped after failed fixture ${fixture.id}: ${results.at(-1).error}`);process.exitCode=1;break}
}
console.log(JSON.stringify({...summary(results),report:outputPath},null,2))

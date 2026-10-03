import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
function run(args, env) { return new Promise(resolve=>{const child=spawn(process.execPath,['scripts/evaluate.mjs',...args],{env:{...process.env,...env},stdio:'pipe'});let text='';child.stdout.on('data',c=>text+=c);child.stderr.on('data',c=>text+=c);child.on('exit',code=>resolve({code,text}))}) }
test('evaluation measures precision/recall and checkpoints genuine response metadata',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'folio-eval-'));const fixture=join(directory,'fixture.json');const report=join(directory,'report.json')
 await writeFile(fixture,JSON.stringify([{id:'test',source:'Bring a signed application form.',expected:[{kind:'document',page:1,quote:'Bring a signed application form.'},{kind:'step',page:1,quote:'Keep a copy.'}]}]))
 const mock=http.createServer((req,res)=>{req.resume();res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url==='/api/status'?{ready:true,model:'mock-only'}:{model:'mock-only',items:[{kind:'document',page:1,quote:'Bring a signed application form.'},{kind:'step',page:1,quote:'Other quote.'}],rejected:[],usage:{prompt_tokens:15}}))})
 await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve))
 try {const execution=await run([fixture,report],{FOLIO_EVAL_BASE_URL:`http://127.0.0.1:${mock.address().port}`});assert.equal(execution.code,0);const data=JSON.parse(await readFile(report,'utf8'));assert.equal(data.synthetic,true);assert.equal(data.summary.precision,.5);assert.equal(data.summary.recall,.5);assert.equal(data.results[0].usage.prompt_tokens,15)} finally {await new Promise(resolve=>mock.close(resolve));await rm(directory,{recursive:true,force:true})}
})
test('evaluation fails before inference when server lacks model configuration',async()=>{
 let compileCalls=0;const mock=http.createServer((req,res)=>{if(req.url==='/api/compile')compileCalls++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ready:false,reason:'No configured endpoint'}))});await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve))
 const directory=await mkdtemp(join(tmpdir(),'folio-eval-'));const fixture=join(directory,'fixture.json');await writeFile(fixture,JSON.stringify([{id:'test',source:'Bring a signed form.',expected:[]}]))
 try {const execution=await run([fixture,join(directory,'report.json')],{FOLIO_EVAL_BASE_URL:`http://127.0.0.1:${mock.address().port}`});assert.equal(execution.code,1);assert.equal(compileCalls,0);assert.ok(execution.text.includes('No inference run'))} finally {await new Promise(resolve=>mock.close(resolve));await rm(directory,{recursive:true,force:true})}
})

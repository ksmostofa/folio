import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function launch(env) {
  const child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, OPENAI_BASE_URL: '', APERTUS_MODEL: '', APERTUS_API_KEY: '', ...env }, stdio: 'pipe' })
  let output = ''
  child.stdout.on('data', c => { output += c.toString() })
  child.stderr.on('data', c => { output += c.toString() })
  for (let i = 0; i < 100 && !output.includes('Folio available'); i++) { await sleep(20); if (child.exitCode !== null) throw new Error(output) }
  if (!output.includes('Folio available')) { child.kill(); throw new Error('Server did not start') }
  return child
}
async function freePort() { const srv = http.createServer(); await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve)); const port = srv.address().port; await new Promise(resolve => srv.close(resolve)); return port }
test('unconfigured server fails closed without a model call', async () => {
  const port = await freePort(); const child = await launch({ PORT: String(port) })
  try { assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/status`)).json()).ready, false); const response = await fetch(`http://127.0.0.1:${port}/api/compile`, { method: 'POST', body: JSON.stringify({ source: 'Bring a signed application form.', language: 'en' }) }); assert.equal(response.status, 503) } finally { child.kill() }
})
test('configured proxy validates endpoint output and preserves telemetry', async () => {
  let request
  let userAgent
  const mock = http.createServer(async (req, res) => { userAgent = req.headers['user-agent']; let body = ''; for await (const chunk of req) body += chunk; request = JSON.parse(body); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items: [{ kind: 'document', page: 1, quote: 'Bring a signed application form.' }, { kind: 'document', page: 1, quote: 'Bring a passport.' }] }) } }], usage: { prompt_tokens: 20, completion_tokens: 15 } })) })
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve)); const mockPort = mock.address().port
  const port = await freePort(); const child = await launch({ PORT: String(port), OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, APERTUS_MODEL: 'test-endpoint-model', APERTUS_ALLOW_LOCAL: '1' })
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/compile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'Bring a signed application form.', language: 'ja' }) }); const data = await response.json()
    assert.equal(response.status, 200); assert.equal(data.items.length, 1); assert.equal(data.rejected.length, 1); assert.equal(data.mode, 'live'); assert.equal(data.model, 'test-endpoint-model'); assert.equal(data.usage.prompt_tokens, 20); assert.equal(request.model, 'test-endpoint-model'); assert.equal(userAgent, 'Folio/1.0'); assert.ok(request.messages[0].content.includes('untrusted source text'))
    const denied = await fetch(`http://127.0.0.1:${port}/api/compile`, { method: 'POST', headers: { Origin: 'http://attacker.invalid' }, body: '{}' }); assert.equal(denied.status, 403)
  } finally { child.kill(); await new Promise(resolve => mock.close(resolve)) }
})

test('malformed and oversized model responses fail closed', async () => {
  let variant = 'schema'
  const mock = http.createServer((req,res) => { req.resume(); res.setHeader('Content-Type','application/json'); res.end(variant === 'oversized' ? 'x'.repeat(256001) : JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'No structured checklist'})}}]})) })
  await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve))
  const port=await freePort(); const child=await launch({PORT:String(port),OPENAI_BASE_URL:`http://127.0.0.1:${mock.address().port}/v1`,APERTUS_MODEL:'fixture-model',APERTUS_ALLOW_LOCAL:'1'})
  try { for (variant of ['schema','oversized']) { const response=await fetch(`http://127.0.0.1:${port}/api/compile`,{method:'POST',body:JSON.stringify({source:'Bring a signed application form.',language:'en'})}); assert.equal(response.status,502); assert.equal((await response.json()).items,undefined) } } finally {child.kill();await new Promise(resolve=>mock.close(resolve))}
})
test('limit concurrent compilations and expose retry advice', async () => {
 let calls=0
 const mock=http.createServer(async(req,res)=>{req.resume();calls++;await sleep(300);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'{"items":[]}'}}]}))})
 await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve))
 const port=await freePort();const child=await launch({PORT:String(port),OPENAI_BASE_URL:`http://127.0.0.1:${mock.address().port}/v1`,APERTUS_MODEL:'fixture-model',APERTUS_ALLOW_LOCAL:'1'})
 const compile=()=>fetch(`http://127.0.0.1:${port}/api/compile`,{method:'POST',body:JSON.stringify({source:'Bring a signed application form.',language:'en'})})
 try {const pending=[compile(),compile()];for(let i=0;i<30&&calls<2;i++)await sleep(10);assert.equal(calls,2);const third=await compile();assert.equal(third.status,429);assert.equal(third.headers.get('retry-after'),'5');assert.equal(calls,2);for(const response of await Promise.all(pending))assert.equal(response.status,200)} finally {child.kill();await new Promise(resolve=>mock.close(resolve))}
})

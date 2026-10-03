// No inference request is made. This command checks configured model discovery only.
const base = process.env.OPENAI_BASE_URL
const model = process.env.APERTUS_MODEL
const key = process.env.APERTUS_API_KEY
if (!base || !model) { console.error('Set OPENAI_BASE_URL and APERTUS_MODEL first. No request made.'); process.exit(1) }
const url = new URL(base)
const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
if (url.username || url.password || url.hash || url.search || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) { console.error('Use a credential-free HTTPS base URL or local HTTP endpoint. No request made.'); process.exit(1) }
if (!key && !(local && process.env.APERTUS_ALLOW_LOCAL === '1')) { console.error('A server API key is required for this provider. No request made.'); process.exit(1) }
try {
 const response = await fetch(`${base.replace(/\/$/, '')}/models`, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Folio/1.0', ...(key ? { Authorization: `Bearer ${key}` } : {}) } })
 if (!response.ok) throw new Error(`Model catalog returned HTTP ${response.status}`)
 const text = await response.text()
 if (text.length > 256000) throw new Error('Oversized model catalog')
 const payload = JSON.parse(text)
 const ids = Array.isArray(payload.data) ? payload.data.map(entry => entry.id).filter(id => typeof id === 'string') : []
 console.log(JSON.stringify({ checkedAt: new Date().toISOString(), endpointHost: url.host, configuredModel: model, available: ids.includes(model), availableModels: ids, inferencePerformed: false }, null, 2))
 if (!ids.includes(model)) process.exitCode = 1
} catch (error) { console.error(error.message); process.exitCode = 1 }

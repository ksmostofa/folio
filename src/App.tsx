import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { CodeBlock } from '@/components/ui/code-block'
import { compileDemo, SAMPLE, splitPages } from './lib/compiler'
import type { CompileResult, EvidenceItem } from './lib/compiler'
import { completedAfterReviewChange, exportReviewedChecklist, restoreCheckpoint, reviewCompletionIssue } from './lib/review'
import type { Checkpoint, Review } from './lib/review'
import './App.css'

type Stored = Checkpoint
const STORAGE_KEY = 'folio-document-v1'
const API_ROOT = `${import.meta.env.BASE_URL}api`
const LANGUAGE_OPTIONS = [{ value: 'ja', label: 'Japanese' }, { value: 'en', label: 'English' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }]
const MODE_OPTIONS = [{ value: 'demo', label: 'Demo rules' }, { value: 'live', label: 'Live Apertus endpoint' }]
const FILTER_OPTIONS = [{ value: 'all', label: 'All requirements' }, { value: 'document', label: 'Documents' }, { value: 'deadline', label: 'Deadlines' }, { value: 'step', label: 'Other steps' }]
function readStored(): Stored | null {
  try { return restoreCheckpoint(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')) } catch { return null }
}
function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.hidden = true
  document.body.appendChild(anchor)
  try { anchor.click() } finally { anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
function App() {
  const [saved] = useState(readStored)
  const [source, setSource] = useState(saved?.source ?? SAMPLE)
  const [title, setTitle] = useState(saved?.title ?? 'Shared workshop application')
  const [language, setLanguage] = useState(saved?.language || 'ja')
  const [completed, setCompleted] = useState<string[]>(saved?.completed || [])
  const [inspected, setInspected] = useState<string[]>(saved?.inspected || [])
  const [reviews, setReviews] = useState<Record<string, Review>>(saved?.reviews || {})
  const [restored, setRestored] = useState(Boolean(saved?.result))
  const [result, setResult] = useState<CompileResult | null>(() => saved ? saved.result : compileDemo(SAMPLE, 'ja'))
  const [active, setActive] = useState('checklist')
  const [mode, setMode] = useState<'demo' | 'live'>('demo')
  const [status, setStatus] = useState<{ ready: boolean; model?: string; reason?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EvidenceItem | null>(null)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const pages = splitPages(source)
  useEffect(() => {
    fetch(`${API_ROOT}/status`).then(r => r.ok ? r.json() : Promise.reject()).then(setStatus).catch(() => setStatus({ ready: false, reason: 'This static demo has no live model API. Run the local server to configure Apertus.' }))
  }, [])
  const editSource = (value: string) => { setSource(value); setResult(null); setSelected(null); setCompleted([]); setReviews({}); setInspected([]); setRestored(false) }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ format: 'folio.review.v1', source, title, language, result, completed, inspected, reviews })); setNotice('Source, cited checklist and review notes saved in this browser.') } catch { setError('Browser storage is unavailable. Export your document instead.') } }
  const clear = () => { try { localStorage.removeItem(STORAGE_KEY) } catch { setError('Browser storage could not be cleared.'); return }; editSource(''); setTitle('Untitled document'); setNotice('Saved document removed from this browser.'); setError('') }
  const reset = () => { editSource(SAMPLE); setTitle('Shared workshop application'); setResult(compileDemo(SAMPLE, language)); setNotice('Loaded fictional demo instructions.'); setError('') }
  const compile = async () => {
    setError(''); setNotice(''); setBusy(true); setResult(null); setCompleted([]); setReviews({}); setInspected([]); setRestored(false); setSelected(null)
    try {
      if (source.trim().length < 20) throw new Error('Add at least 20 characters of source text.')
      if (mode === 'demo') { setResult(compileDemo(source, language)); setActive('checklist') }
      else {
        const response = await fetch(`${API_ROOT}/compile`, { signal: AbortSignal.timeout(65000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, language }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Compilation failed.')
        setResult(data); setActive('checklist')
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Request failed. No checklist was accepted.') }
    finally { setBusy(false) }
  }
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > (/\.json$/i.test(file.name) ? 2000000 : 150000) || !/\.(txt|md|json)$/i.test(file.name)) { setError('Import .txt/.md below 150 KB or a Folio review JSON below 2 MB.'); event.target.value = ''; return }
    const text = await file.text()
    if (/\.json$/i.test(file.name)) {
      try { const checkpoint = restoreCheckpoint(JSON.parse(text)); if (!checkpoint) throw new Error(); setSource(checkpoint.source); setTitle(checkpoint.title); setLanguage(checkpoint.language); setResult(checkpoint.result); setCompleted(checkpoint.completed); setReviews(checkpoint.reviews); setInspected(checkpoint.inspected); setSelected(null); setRestored(true); setActive('checklist'); setNotice('Review restored. Every original quote was revalidated; imported model metadata is not verified.'); setError('') } catch { setError('Invalid review checkpoint or source citation mismatch. Current document retained.') }
      event.target.value = ''; return
    }
    if (text.length > 50000) { setError('Source exceeds 50,000 characters.'); return }
    editSource(text); setTitle(file.name.replace(/\.(txt|md)$/i, '')); setActive('source'); setNotice('Text imported. Compile to inspect its requirements.'); event.target.value = ''
  }
  const openCitation = (item: EvidenceItem) => { setSelected(item); setInspected(prev => prev.includes(item.id) ? prev : [...prev, item.id]) }
  const changeReview = (id: string, next: Review) => { setReviews(prev => ({ ...prev, [id]: next })); setCompleted(prev => completedAfterReviewChange(id, next, prev, inspected)) }
  const exportEvidence = () => result && download('folio-evidence.json', JSON.stringify({ format: 'folio.evidence.v1', document: title, sourcePages: pages, targetLanguage: language, ...result, completed, inspected, reviews, limitations: ['Exact quotes validate source presence only, not authority or legal applicability.', 'Translations are drafts and need review.', 'Demo extraction uses English line rules.'] }, null, 2), 'application/json')
  const items = result?.items.filter(item => filter === 'all' || item.kind === filter) || []
  const documents = result?.items.filter(item => item.kind === 'document').length || 0
  const deadlines = result?.items.filter(item => item.kind === 'deadline').length || 0
  const total = result?.items.length || 0
  return (
    <div className="folio-shell">
      <aside className="folio-sidebar">
        <a className="folio-brand" href={import.meta.env.BASE_URL} aria-label="Folio home"><span className="folio-mark">f</span><span>folio<span className="folio-brand-sub">Evidence before answers</span></span></a>
        <div className="sidebar-section"><span className="eyebrow">WORKSPACE</span><Button variant="secondary" className="sidebar-current" onClick={() => setActive('checklist')}><span className="nav-dot" />Document review</Button><Button variant="ghost" className="sidebar-link" onClick={() => setActive('source')}>Source pages <span>{pages.length}</span></Button><Button variant="ghost" className="sidebar-link" onClick={() => setActive('evidence')}>Evidence ledger <span>{total}</span></Button></div>
        <div className="sidebar-document"><span className="eyebrow">CURRENT DOCUMENT</span><span className="document-symbol">▤</span><p>{title || 'Untitled document'}</p><span className="muted">{source === SAMPLE ? 'Fictional sample · English' : 'Imported source text'}</span><Badge variant="outline">Browser-local workspace</Badge></div>
        <div className="sidebar-bottom"><div className="privacy-dot" /><p>Source text stays in this browser in demo mode. Live mode sends it to your configured endpoint.</p><Button variant="ghost" size="sm" disabled={busy} onClick={clear}>Clear saved document</Button></div>
      </aside>
      <main className="folio-main">
        <header className="folio-topbar"><div><span className="breadcrumb">Workspace / </span>Document review</div><div className="topbar-actions"><Badge variant="outline">{restored ? 'Saved review' : mode === 'demo' ? 'Deterministic demo' : 'Live Apertus'}</Badge><Button variant="outline" size="sm" disabled={busy} onClick={save}>Save locally</Button></div></header>
        <div className="folio-content">
          <div className="page-heading"><div><span className="eyebrow">DOCUMENT TO ACTION</span><h1>A checklist you can trace.</h1><p>Keep the original wording. Inspect every citation. Resolve what the source leaves unanswered.</p></div><Button disabled={busy} onClick={() => fileInput.current?.click()} variant="outline">Import document</Button><input ref={fileInput} type="file" accept=".txt,.md,.json,text/plain,text/markdown,application/json" hidden onChange={importFile} /></div>
          <Alert className="mode-alert"><AlertDescription><strong>{mode === 'demo' ? 'Rule-based extraction, no live AI.' : 'Live extraction, source-grounded output.'}</strong> {mode === 'demo' ? 'Extraction uses fixed English rules. The built-in sample is fictional; its Japanese and French translations are supplied drafts.' : 'Original quotes must match a complete source sentence or line. Translation accuracy and applicability still need your review.'}</AlertDescription></Alert>
          {restored && <Alert><AlertDescription>Restored review. Quotes were revalidated against the saved source. Recorded model names are imported metadata, not proof of a live call.</AlertDescription></Alert>}
          {error && <Alert variant="destructive"><AlertDescription role="alert">{error}</AlertDescription></Alert>}
          {notice && <p className="notice" role="status">{notice}</p>}
          <div className="control-panel"><div className="title-input"><Label htmlFor="title">Document name</Label><Input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} /></div><div><Label htmlFor="language">Reading language</Label><Select disabled={busy} items={LANGUAGE_OPTIONS} value={language} onValueChange={value => { if (!value) return; setLanguage(value); setResult(null); setCompleted([]); setReviews({}); setInspected([]); setRestored(false); setSelected(null) }}><SelectTrigger id="language" className="folio-select-trigger"><SelectValue /></SelectTrigger><SelectContent>{LANGUAGE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="mode">Extraction mode</Label><Select disabled={busy} items={MODE_OPTIONS} value={mode} onValueChange={value => { if (value === 'demo' || value === 'live') setMode(value) }}><SelectTrigger id="mode" className="folio-select-trigger"><SelectValue /></SelectTrigger><SelectContent>{MODE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><Button disabled={busy || !source.trim() || (mode === 'live' && !status?.ready)} onClick={compile}>{busy ? 'Compiling…' : 'Compile checklist'} <span aria-hidden>↗</span></Button></div>
          {mode === 'live' && <p className="endpoint-status">{status?.ready ? `Configured model (connection not verified): ${status.model}` : status?.reason || 'Checking endpoint…'}{!status?.ready && ' See README for server configuration.'}</p>}
          <div className="metrics-row"><Card><CardContent><span className="metric-label">SOURCE PAGES</span><strong><AnimatedCounter value={pages.length} /></strong><small>Numbered at import</small></CardContent></Card><Card><CardContent><span className="metric-label">DOCUMENTS</span><strong><AnimatedCounter value={documents} /></strong><small>Exact requirement quotes</small></CardContent></Card><Card><CardContent><span className="metric-label">DEADLINES</span><strong><AnimatedCounter value={deadlines} /></strong><small>Original dates retained</small></CardContent></Card><Card><CardContent><span className="metric-label">REVIEW PROGRESS</span><strong><AnimatedCounter value={completed.length} /><span className="metric-denominator"> / {total}</span></strong><small>You confirm each instruction</small></CardContent></Card></div>
          <Tabs value={active} onValueChange={value => setActive(String(value))} className="review-tabs"><div className="review-tabbar"><TabsList><TabsTrigger value="checklist">Checklist</TabsTrigger><TabsTrigger value="source">Source pages</TabsTrigger><TabsTrigger value="evidence">Evidence ledger</TabsTrigger></TabsList><Button variant="ghost" size="sm" disabled={busy} onClick={reset}>Load demo sample</Button></div>
            <TabsContent value="checklist"><div className="review-grid"><section className="checklist-section"><div className="section-heading"><div><h2>Required actions</h2><p>Open the citation and decide applicability. Explain any 'Not applicable' decision before checking an item.</p></div><Select items={FILTER_OPTIONS} value={filter} onValueChange={value => { if (value) setFilter(value) }}><SelectTrigger aria-label="Filter checklist" className="filter-select"><SelectValue /></SelectTrigger><SelectContent>{FILTER_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
              {!result ? <div className="empty-state"><h3>Your source is ready for review</h3><p>Compile the checklist to extract supported instructions.</p></div> : items.length === 0 ? <div className="empty-state"><h3>No supported instructions found</h3><p>{mode === 'demo' ? 'Demo rules recognize English lines starting with Bring, Submit, Send, Keep, or If ... bring. Use a configured Apertus endpoint for other source text.' : 'The model did not return any instructions that passed the citation checks.'}</p></div> : <div className="checklist-items">{items.map(item => <Card key={item.id} className={`evidence-card ${selected?.id === item.id ? 'selected' : ''} ${completed.includes(item.id) ? 'completed' : ''}`}><CardContent><Checkbox aria-label={`Mark reviewed: ${item.quote}`} aria-describedby={`gate-${item.id}`} disabled={Boolean(reviewCompletionIssue(reviews[item.id], inspected.includes(item.id)))} checked={completed.includes(item.id)} onCheckedChange={value => setCompleted(prev => value && !reviewCompletionIssue(reviews[item.id], inspected.includes(item.id)) ? [...new Set([...prev, item.id])] : prev.filter(id => id !== item.id))} /><div className="evidence-content"><div className="evidence-meta"><Badge variant={item.kind === 'deadline' ? 'secondary' : 'outline'}>{item.kind}</Badge>{/^If /i.test(item.quote) && <Badge variant="secondary">Conditional</Badge>}<Button variant="ghost" size="sm" className="citation-link" onClick={() => openCitation(item)}>Page {item.page} <span aria-hidden>↗</span></Button></div><p className="source-quote">{item.quote}</p>{item.translation ? <p className="translated-text"><span>Translation draft</span>{item.translation}</p> : language !== 'en' && <p className="no-translation">No translation supplied. Original text retained.</p>}<div className="item-review"><Label htmlFor={`review-${item.id}`}>Does this instruction apply?</Label><Select items={[{value:"unresolved",label:"Needs review"},{value:"applies",label:"Applies to me"},{value:"not-applicable",label:"Not applicable"}]} value={reviews[item.id]?.applicability || "unresolved"} onValueChange={value => { if (value === "unresolved" || value === "applies" || value === "not-applicable") changeReview(item.id, {applicability:value,note:reviews[item.id]?.note || ""}) }}><SelectTrigger id={`review-${item.id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unresolved">Needs review</SelectItem><SelectItem value="applies">Applies to me</SelectItem><SelectItem value="not-applicable">Not applicable</SelectItem></SelectContent></Select><Input aria-label={`Review note: ${item.quote}`} placeholder={reviews[item.id]?.applicability === "not-applicable" ? "Explain why this instruction does not apply" : "Review note or question for the issuer"} value={reviews[item.id]?.note || ""} maxLength={1500} onChange={event => changeReview(item.id, {applicability:reviews[item.id]?.applicability || "unresolved",note:event.target.value})} /><p id={`gate-${item.id}`} className="review-gate">{reviewCompletionIssue(reviews[item.id], inspected.includes(item.id)) || "Source citation opened and applicability decided. You can mark this item reviewed."}</p></div></div></CardContent></Card>)}</div>}
              {result && <div className="export-actions"><Button variant="outline" onClick={() => download('folio-checklist.txt', exportReviewedChecklist(result, completed, reviews), 'text/plain')}>Export checklist</Button><Button variant="ghost" onClick={exportEvidence}>Export evidence JSON</Button><Button variant="ghost" onClick={() => download("folio-review.json",JSON.stringify({format:"folio.review.v1",source,title,language,result,completed,inspected,reviews},null,2),"application/json")}>Export review checkpoint</Button></div>}
            </section><aside className="review-aside"><Card className="citation-panel"><CardContent><span className="eyebrow">SOURCE INSPECTOR</span><h3>{selected ? `Page ${selected.page}` : 'Open a citation'}</h3><p className="muted">{selected ? 'The highlighted quote matches this page exactly.' : 'Click a page reference to read the full source context.'}</p>{selected ? <div className="source-context">{(() => { const text = pages.find(page => page.number === selected.page)?.text || ''; const index = text.indexOf(selected.quote); return <>{text.slice(0, index)}<mark>{selected.quote}</mark>{text.slice(index + selected.quote.length)}</> })()}</div> : <div className="citation-placeholder">[ p. 01 ]<span>Original wording, visible context.</span></div>}<div className="inspector-note">A matching quote proves where the text came from. It does not prove the source is current or that the instruction applies to you.</div></CardContent></Card><Card className="questions-panel"><CardContent><span className="eyebrow">BEFORE YOU SUBMIT</span><h3>Questions to resolve</h3>{(result?.questions || ['Compile the source to begin a review.']).map((q, index) => <p key={q}><span>{String(index + 1).padStart(2, '0')}</span>{q}</p>)}</CardContent></Card></aside></div></TabsContent>
            <TabsContent value="source"><div className="source-editor"><div className="section-heading"><div><h2>Original source</h2><p>Paste text, import a .txt / .md file, or restore a Folio review JSON checkpoint. Put ---PAGE--- on its own line between pages.</p></div><Badge variant="outline">{source.length.toLocaleString()} / 50,000 characters</Badge></div><Textarea disabled={busy} aria-label="Original source document" value={source} maxLength={50000} onChange={e => editSource(e.target.value)} className="source-textarea" /><div className="page-previews">{pages.map(page => <Card key={page.number}><CardContent><Badge variant="secondary">Page {page.number}</Badge><pre>{page.text || 'Empty page'}</pre></CardContent></Card>)}</div></div></TabsContent>
            <TabsContent value="evidence"><div className="ledger"><div className="section-heading"><div><h2>Validation ledger</h2><p>Only exact source quotes reach the checklist. Translation drafts are not validated by the quote check.</p></div><Button variant="outline" disabled={!result} onClick={exportEvidence}>Export JSON</Button></div><div className="ledger-summary"><Badge variant="secondary">{total} source matches</Badge><Badge variant="outline">{result?.rejected.length || 0} rejected items</Badge><Badge variant="outline">{result?.mode === 'live' ? result.model : 'No model call'}</Badge>{result?.elapsedMs !== undefined && <Badge variant="outline">{result.elapsedMs} ms</Badge>}{result?.usage?.prompt_tokens !== undefined && <Badge variant="outline">{result.usage.prompt_tokens} input tokens</Badge>}</div>{result?.items.map(item => <div className="ledger-row" key={item.id}><span className="ledger-status">MATCH</span><span>{item.quote}</span><Button variant="ghost" size="sm" onClick={() => { openCitation(item); setActive('checklist') }}>p. {item.page}</Button></div>)}{result?.rejected.map(rejection => <div className="ledger-row rejected" key={rejection.index}><span>REJECTED</span><span>Item {rejection.index + 1}: {rejection.reason}</span></div>)}{!result && <div className="empty-state">Compile a document to inspect its evidence ledger.</div>}{result && <CodeBlock className="evidence-code" code={JSON.stringify({ format: 'folio.evidence.v1', mode: result.mode, model: result.model ?? null, items: result.items, rejected: result.rejected }, null, 2)} language="json" mode="dark" filename="folio-evidence.json" showLineNumbers={false} />}<div className="ledger-limitations"><h3>What this validator checks</h3><p>Exact page membership, complete sentence or line boundaries, valid item type, duplicate quotes and output limits. It does not certify source authority, legal interpretation, completeness or translation accuracy. Imported source text can itself be wrong.</p></div></div></TabsContent>
          </Tabs>
          <footer className="folio-footer"><span>Folio · Source-first document review</span><span>Built with <a href="https://rareui.com" target="_blank" rel="noreferrer">Rare UI</a> · Hack Apertus prototype</span></footer>
        </div>
      </main>
    </div>
  )
}
export default App

export type Page = { number: number; text: string }
export type Kind = 'document' | 'deadline' | 'step'
export type EvidenceItem = { id: string; kind: Kind; quote: string; page: number; translation: string | null }
export type Rejection = { index: number; reason: string }
export type CompileResult = { items: EvidenceItem[]; rejected: Rejection[]; questions: string[]; mode: 'demo' | 'live'; model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number }; elapsedMs?: number }
export const SAMPLE = `FOLIO DEMONSTRATION · Fictional municipal instructions\nThis is a synthetic form. It is not government guidance.\n\nService: Register a shared workshop space\nBring a signed application form.\nBring a copy of the workshop rental agreement.\nSubmit the application by 20 November 2026.\n\n---PAGE---\nSupporting information\nBring a floor plan showing the workshop entrance.\nIf the space has more than 12 seats, bring a safety inspection report.\nSend the completed form to the service counter.\n\n---PAGE---\nFollow-up\nKeep a copy of your submitted application.\nThe source does not state the application fee.\nThe source does not state the processing time.`
export const DEMO_TRANSLATIONS: Record<string, Record<string, string>> = {
  ja: {
    'Bring a signed application form.': '署名した申請書を持参してください。',
    'Bring a copy of the workshop rental agreement.': '作業場の賃貸契約書のコピーを持参してください。',
    'Submit the application by 20 November 2026.': '2026年11月20日までに申請書を提出してください。',
    'Bring a floor plan showing the workshop entrance.': '作業場の入口を示す平面図を持参してください。',
    'If the space has more than 12 seats, bring a safety inspection report.': '座席数が12席を超える場合、安全検査報告書を持参してください。',
    'Send the completed form to the service counter.': '記入した書類をサービス窓口へ提出してください。',
    'Keep a copy of your submitted application.': '提出した申請書のコピーを保管してください。',
  },
  fr: {
    'Bring a signed application form.': 'Apportez un formulaire de demande signé.',
    'Bring a copy of the workshop rental agreement.': "Apportez une copie du contrat de location de l'atelier.",
    'Submit the application by 20 November 2026.': 'Déposez la demande avant le 20 novembre 2026.',
    'Bring a floor plan showing the workshop entrance.': "Apportez un plan indiquant l'entrée de l'atelier.",
    'If the space has more than 12 seats, bring a safety inspection report.': "Si le local compte plus de 12 places, apportez un rapport d'inspection de sécurité.",
    'Send the completed form to the service counter.': 'Remettez le formulaire rempli au guichet.',
    'Keep a copy of your submitted application.': 'Conservez une copie de votre demande déposée.',
  },
}
export function splitPages(source: string): Page[] {
  return source.split(/\n\s*---PAGE---\s*\n|\f/).map((text, index) => ({ number: index + 1, text: text.trim() }))
}
export function validateCandidates(raw: unknown, pages: Page[]): Pick<CompileResult, 'items' | 'rejected'> {
  const items: EvidenceItem[] = []
  const rejected: Rejection[] = []
  if (!Array.isArray(raw)) return { items, rejected: [{ index: -1, reason: 'Model response must contain an items array.' }] }
  const seen = new Set<string>()
  raw.slice(0, 100).forEach((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') { rejected.push({ index, reason: 'Invalid item.' }); return }
    const c = candidate as Record<string, unknown>
    if (!['document', 'deadline', 'step'].includes(String(c.kind))) { rejected.push({ index, reason: 'Unknown requirement type.' }); return }
    if (!Number.isInteger(c.page) || typeof c.quote !== 'string' || c.quote.trim().length < 8 || c.quote.length > 1600) { rejected.push({ index, reason: 'Missing page or complete source quote.' }); return }
    const page = pages.find(p => p.number === c.page)
    if (!page || !page.text.includes(c.quote)) { rejected.push({ index, reason: 'Citation does not match that source page exactly.' }); return }
    // Do not accept a fragment cut out of a sentence, especially a removed condition.
    const start = page.text.indexOf(c.quote)
    const prefix = page.text.slice(0, start)
    const previousLine = prefix.trimEnd().split('\n').at(-1) || ''
    const followsConditionalLine = /\n[ \t]*$/.test(prefix) && /^(If|Unless|When|Si |Wenn|Falls)\b|場合/.test(previousLine) && /[,，:：]$/.test(previousLine)
    const validStart = /(?:^|[\n.!?。！？])\s*$/.test(prefix) && !followsConditionalLine
    const after = page.text[start + c.quote.length] ?? ''
    if (!validStart || (after && !/[\n.!?。！？]/.test(after) && !/[.!?。！？]$/.test(c.quote))) { rejected.push({ index, reason: 'Quote must preserve a complete source sentence or line, including conditions.' }); return }
    const key = `${c.page}:${c.quote}`
    if (seen.has(key)) { rejected.push({ index, reason: 'Duplicate citation.' }); return }
    seen.add(key)
    items.push({ id: `evidence-${items.length + 1}`, kind: c.kind as Kind, page: c.page as number, quote: c.quote, translation: typeof c.translation === 'string' && c.translation.trim() ? c.translation.slice(0, 2000) : null })
  })
  if (raw.length > 100) rejected.push({ index: 100, reason: 'Response exceeds 100-item limit.' })
  return { items, rejected }
}
export function compileDemo(source: string, language: string): CompileResult {
  const pages = splitPages(source)
  const candidates = pages.flatMap(page => page.text.split('\n').filter(line => /^(Bring |Submit |Send |Keep |If .*, bring )/.test(line)).map(quote => ({ page: page.number, quote, kind: quote.startsWith('Submit ') ? 'deadline' : /^(Bring |If )/.test(quote) ? 'document' : 'step', translation: DEMO_TRANSLATIONS[language]?.[quote] ?? null })))
  return { ...validateCandidates(candidates, pages), questions: ['Which conditional instructions apply to your situation?', 'Confirm any fee and processing time with the source issuer.'], mode: 'demo' }
}
export function exportChecklist(result: CompileResult, completed: string[]): string {
  return ['Folio evidence checklist', 'Review source authenticity, current validity and conditional instructions before acting.', '', ...result.items.map(item => `${completed.includes(item.id) ? '[x]' : '[ ]'} ${item.quote} [page ${item.page}]${item.translation ? `\n    Translation draft: ${item.translation}` : ''}`), '', 'Review questions', ...result.questions.map(q => `- ${q}`)].join('\n')
}

import { exportChecklist, splitPages, validateCandidates } from './compiler.ts'
import type { CompileResult } from './compiler.ts'
export type Review = { applicability: 'unresolved' | 'applies' | 'not-applicable'; note: string }
export type Checkpoint = { format: 'folio.review.v1'; source: string; title: string; language: string; result: CompileResult | null; completed: string[]; reviews: Record<string, Review> }
export function restoreCheckpoint(value: unknown): Checkpoint | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (v.format !== 'folio.review.v1' || typeof v.source !== 'string' || v.source.length > 50000 || typeof v.title !== 'string' || typeof v.language !== 'string' || !['en', 'ja', 'fr', 'de'].includes(v.language)) return null
  let result: CompileResult | null = null
  if (v.result && typeof v.result === 'object') {
    const r = v.result as CompileResult
    if (!['live', 'demo'].includes(r.mode) || !Array.isArray(r.items)) return null
    const validation = validateCandidates(r.items, splitPages(v.source))
    if (validation.rejected.length) return null
    result = { ...validation, mode: r.mode, questions: ['Restored checklist: verify source currency and applicability before acting.', 'Imported model metadata is user-supplied and does not prove an actual model call.'], ...(typeof r.model === 'string' ? { model: r.model.slice(0, 200) } : {}) }
  }
  const ids = new Set(result?.items.map(item => item.id) || [])
  const completed = Array.isArray(v.completed) ? [...new Set(v.completed.filter(id => typeof id === 'string' && ids.has(id)))] as string[] : []
  const reviews: Record<string, Review> = {}
  if (v.reviews && typeof v.reviews === 'object') {
    for (const [id, entry] of Object.entries(v.reviews)) {
      if (!ids.has(id) || !entry || !['unresolved', 'applies', 'not-applicable'].includes(entry.applicability) || typeof entry.note !== 'string') continue
      reviews[id] = { applicability: entry.applicability, note: entry.note.slice(0, 1500) }
    }
  }
  return { format: 'folio.review.v1', source: v.source, title: v.title.slice(0, 100), language: v.language, result, completed, reviews }
}

export function exportReviewedChecklist(result: CompileResult, completed: string[], reviews: Record<string, Review>): string {
  return `${exportChecklist(result, completed)}\n\nHuman review notes (reviewer supplied)\n${result.items.map(item => { const review = reviews[item.id]; return `${item.id}: ${review?.applicability || 'unresolved'}${review?.note ? `\n    ${review.note}` : ''}` }).join('\n')}`
}

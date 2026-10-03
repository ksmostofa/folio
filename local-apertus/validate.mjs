import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const folder = process.argv[2] || resolve(import.meta.dirname, '../folio')
const { splitPages, validateCandidates } = await import(pathToFileURL(resolve(folder, 'src/lib/compiler.ts')))
const input = JSON.parse(readFileSync(0, 'utf8'))
console.log(JSON.stringify(validateCandidates(input.items, splitPages(input.source))))

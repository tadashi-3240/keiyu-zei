import type { DieselBreakdown } from './dieselTax.ts'

export const HISTORY_KEY = 'keiyu-zei:history'
const HISTORY_LIMIT = 10

export type HistoryEntry = {
  id: string
  month: number
  day: number
  pricePerLiter: number
  liters: number
  deliveryPerLiter: number
  consumptionPercent: number
  deliveryYen: number
  consumptionYen: number
  bodyYen: number
  paymentYen: number
}

export function formatHistoryDate(month: number, day: number): string {
  return `${month}月${day}日`
}

export function rememberCalculation(
  history: HistoryEntry[],
  breakdown: DieselBreakdown,
  consumptionPercent: number,
  now = new Date(),
): HistoryEntry[] {
  const latest = history[0]
  if (latest && isSameCalculation(latest, breakdown, consumptionPercent, now)) return history
  return [createHistoryEntry(breakdown, consumptionPercent, now), ...history].slice(0, HISTORY_LIMIT)
}

function isSameCalculation(
  entry: HistoryEntry,
  breakdown: DieselBreakdown,
  consumptionPercent: number,
  now: Date,
): boolean {
  return (
    entry.month === now.getMonth() + 1 &&
    entry.day === now.getDate() &&
    entry.pricePerLiter === breakdown.pricePerLiter &&
    entry.liters === breakdown.liters &&
    entry.deliveryPerLiter === breakdown.deliveryPerLiter &&
    entry.consumptionPercent === consumptionPercent &&
    entry.deliveryYen === breakdown.deliveryYen &&
    entry.consumptionYen === breakdown.consumptionYen &&
    entry.bodyYen === breakdown.bodyYen &&
    entry.paymentYen === breakdown.paymentYen
  )
}

export function createHistoryEntry(
  breakdown: DieselBreakdown,
  consumptionPercent: number,
  now = new Date(),
): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    pricePerLiter: breakdown.pricePerLiter,
    liters: breakdown.liters,
    deliveryPerLiter: breakdown.deliveryPerLiter,
    consumptionPercent,
    deliveryYen: breakdown.deliveryYen,
    consumptionYen: breakdown.consumptionYen,
    bodyYen: breakdown.bodyYen,
    paymentYen: breakdown.paymentYen,
  }
}

export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    isMonth(entry.month) &&
    isDay(entry.day) &&
    isAmount(entry.pricePerLiter) &&
    isAmount(entry.liters) &&
    isAmount(entry.deliveryPerLiter) &&
    isAmount(entry.consumptionPercent) &&
    isYen(entry.deliveryYen) &&
    isYen(entry.consumptionYen) &&
    isYen(entry.bodyYen) &&
    isYen(entry.paymentYen)
  )
}

function isMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
}

function isDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isYen(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

import { describe, expect, it } from 'vitest'
import { calculateBreakdown } from './dieselTax.ts'
import { createHistoryEntry, formatHistoryDate, parseHistory, rememberCalculation } from './history.ts'

describe('formatHistoryDate', () => {
  it('shows month and day without a year', () => {
    expect(formatHistoryDate(10, 19)).toBe('10月19日')
    expect(formatHistoryDate(1, 5)).toBe('1月5日')
    expect(formatHistoryDate(10, 19)).not.toContain('2026')
    expect(formatHistoryDate(10, 19)).not.toContain('年')
  })
})

describe('createHistoryEntry', () => {
  it('records the calculation on that month and day', () => {
    const breakdown = calculateBreakdown(40, 160, 15, 0.1)
    expect(breakdown).not.toBeNull()
    if (!breakdown) return

    const entry = createHistoryEntry(breakdown, 10, new Date(2026, 9, 19))
    expect(entry.month).toBe(10)
    expect(entry.day).toBe(19)
    expect(entry).not.toHaveProperty('year')
    expect(entry.deliveryYen).toBe(600)
    expect(entry.consumptionYen).toBe(527)
    expect(entry.bodyYen).toBe(5273)
    expect(formatHistoryDate(entry.month, entry.day)).toBe('10月19日')
  })
})

describe('rememberCalculation', () => {
  it('keeps a new calculation and skips the same one on the same day', () => {
    const first = calculateBreakdown(40, 160, 15, 0.1)
    const second = calculateBreakdown(50, 160, 15, 0.1)
    const today = new Date(2026, 9, 19)
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    if (!first || !second) return

    const saved = rememberCalculation([], first, 10, today)
    expect(saved).toHaveLength(1)
    expect(rememberCalculation(saved, first, 10, today)).toBe(saved)

    const nextDay = rememberCalculation(saved, first, 10, new Date(2026, 9, 20))
    expect(nextDay).toHaveLength(2)
    expect(formatHistoryDate(nextDay[0]!.month, nextDay[0]!.day)).toBe('10月20日')

    const changed = rememberCalculation(saved, second, 10, today)
    expect(changed).toHaveLength(2)
    expect(changed[0]?.liters).toBe(50)
  })

  it('keeps only the latest 10 calculations', () => {
    let history: ReturnType<typeof rememberCalculation> = []
    const today = new Date(2026, 9, 19)
    for (let liters = 1; liters <= 11; liters += 1) {
      const breakdown = calculateBreakdown(liters, 160, 15, 0.1)
      expect(breakdown).not.toBeNull()
      if (!breakdown) return
      history = rememberCalculation(history, breakdown, 10, today)
    }
    expect(history).toHaveLength(10)
    expect(history[0]?.liters).toBe(11)
    expect(history[9]?.liters).toBe(2)
  })
})

describe('parseHistory', () => {
  it('drops entries that are not calculations', () => {
    const raw = JSON.stringify([
      {
        id: 'a',
        month: 10,
        day: 19,
        year: 2026,
        pricePerLiter: 160,
        liters: 40,
        deliveryPerLiter: 15,
        consumptionPercent: 10,
        deliveryYen: 600,
        consumptionYen: 527,
        bodyYen: 5273,
        paymentYen: 6400,
      },
      { id: 'bad', month: 13, day: 1 },
    ])
    const history = parseHistory(raw)
    expect(history).toHaveLength(1)
    expect(history[0]?.id).toBe('a')
    expect(formatHistoryDate(history[0]!.month, history[0]!.day)).toBe('10月19日')
  })
})

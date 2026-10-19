import { describe, expect, it } from 'vitest'
import {
  calculateBreakdown,
  CURRENT_RATE_PER_LITER,
  DEFAULT_CONSUMPTION_TAX_RATE,
  parseAmount,
  PREVIOUS_RATE_PER_LITER,
} from './dieselTax.ts'

describe('parseAmount', () => {
  it('reads plain and full-width numbers', () => {
    expect(parseAmount('160')).toBe(160)
    expect(parseAmount('１６０')).toBe(160)
    expect(parseAmount('1,000')).toBe(1000)
    expect(parseAmount('1，000')).toBe(1000)
    expect(parseAmount('１５．５')).toBe(15.5)
    expect(parseAmount(' 40 ')).toBe(40)
  })

  it('rejects empty and non-numeric text', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('-1')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
  })
})

describe('calculateBreakdown', () => {
  it('splits 160 yen/L × 40 L at 15 yen/L and 10%', () => {
    const result = calculateBreakdown(40, 160, CURRENT_RATE_PER_LITER, DEFAULT_CONSUMPTION_TAX_RATE)
    expect(result).toMatchObject({
      paymentYen: 6400,
      deliveryYen: 600,
      consumptionYen: 527,
      bodyYen: 5273,
    })
  })

  it('uses a custom diesel tax and consumption rate', () => {
    const result = calculateBreakdown(40, 160, PREVIOUS_RATE_PER_LITER, 0.08)
    expect(result).toMatchObject({
      paymentYen: 6400,
      deliveryYen: 1284,
      consumptionYen: 379,
      bodyYen: 4737,
    })
  })

  it('keeps the three parts equal to the payment', () => {
    const result = calculateBreakdown(33.3, 158.4, PREVIOUS_RATE_PER_LITER, 0.1)
    expect(result).not.toBeNull()
    if (!result) return
    expect(result.deliveryYen + result.consumptionYen + result.bodyYen).toBe(result.paymentYen)
  })

  it('rejects zero liters and a negative tax rate', () => {
    expect(calculateBreakdown(0, 160, CURRENT_RATE_PER_LITER, 0.1)).toBeNull()
    expect(calculateBreakdown(40, 160, -1, 0.1)).toBeNull()
    expect(calculateBreakdown(40, 160, 15, -0.1)).toBeNull()
  })
})

/** 令和8年4月1日以降の軽油引取税。1リットルあたり15円。 */
export const CURRENT_RATE_PER_LITER = 15

/** 令和8年3月31日までの当分の間税率。1リットルあたり32.1円。 */
export const PREVIOUS_RATE_PER_LITER = 32.1

/** 標準の消費税率。 */
export const DEFAULT_CONSUMPTION_TAX_RATE = 0.1

export type DieselBreakdown = {
  liters: number
  pricePerLiter: number
  deliveryPerLiter: number
  consumptionRate: number
  paymentYen: number
  deliveryYen: number
  consumptionYen: number
  bodyYen: number
}

/** 円未満を四捨五入する。正の金額で 0.5 は切り上げる。 */
export function roundYen(value: number): number {
  const sign = value < 0 ? -1 : 1
  return sign * Math.round(Math.abs(value) + 1e-8)
}

export function parseAmount(raw: string): number | null {
  const normalized = raw
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[，,]/g, '')
    .replace(/．/g, '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function calculateBreakdown(
  liters: number,
  pricePerLiter: number,
  deliveryPerLiter: number,
  consumptionRate: number,
): DieselBreakdown | null {
  if (
    !Number.isFinite(liters) ||
    !Number.isFinite(pricePerLiter) ||
    !Number.isFinite(deliveryPerLiter) ||
    !Number.isFinite(consumptionRate)
  ) {
    return null
  }
  if (liters <= 0 || pricePerLiter < 0 || deliveryPerLiter < 0 || consumptionRate < 0) return null

  const paymentYen = roundYen(liters * pricePerLiter)
  const deliveryYen = roundYen(liters * deliveryPerLiter)
  const taxableYen = paymentYen - deliveryYen
  const consumptionYen = roundYen((taxableYen * consumptionRate) / (1 + consumptionRate))
  const bodyYen = paymentYen - deliveryYen - consumptionYen

  return {
    liters,
    pricePerLiter,
    deliveryPerLiter,
    consumptionRate,
    paymentYen,
    deliveryYen,
    consumptionYen,
    bodyYen,
  }
}

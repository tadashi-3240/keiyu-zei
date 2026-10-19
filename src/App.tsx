import { useEffect, useMemo, useState } from 'react'
import {
  calculateBreakdown,
  CURRENT_RATE_PER_LITER,
  parseAmount,
  PREVIOUS_RATE_PER_LITER,
  type DieselBreakdown,
} from './lib/dieselTax.ts'
import {
  formatHistoryDate,
  HISTORY_KEY,
  parseHistory,
  rememberCalculation,
  type HistoryEntry,
} from './lib/history.ts'

type Screen = 'calc' | 'settings' | 'history'

const DELIVERY_PRESETS = [CURRENT_RATE_PER_LITER, PREVIOUS_RATE_PER_LITER]
const DELIVERY_KEY = 'keiyu-zei:delivery-per-liter'
const CONSUMPTION_KEY = 'keiyu-zei:consumption-percent'
const numberInputProps = {
  type: 'text' as const,
  inputMode: 'decimal' as const,
  autoComplete: 'off' as const,
  autoCapitalize: 'off' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
  enterKeyHint: 'done' as const,
}

const yen = new Intl.NumberFormat('ja-JP')

function formatNumber(value: number): string {
  return yen.format(value)
}

function formatYen(value: number): string {
  return `${formatNumber(value)}円`
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 3 }).format(value)
}

function readSetting(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 保存できない環境では、画面上の入力だけを使う。
  }
}

export default function App() {
  const [priceText, setPriceText] = useState('160')
  const [literText, setLiterText] = useState('40')
  const [deliveryText, setDeliveryText] = useState(() => readSetting(DELIVERY_KEY, '15'))
  const [consumptionText, setConsumptionText] = useState(() => readSetting(CONSUMPTION_KEY, '10'))
  const [history, setHistory] = useState<HistoryEntry[]>(() => parseHistory(readSetting(HISTORY_KEY, '')))
  const [edited, setEdited] = useState(false)
  const [screen, setScreen] = useState<Screen>('calc')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  useEffect(() => {
    writeSetting(DELIVERY_KEY, deliveryText)
  }, [deliveryText])

  useEffect(() => {
    writeSetting(CONSUMPTION_KEY, consumptionText)
  }, [consumptionText])

  useEffect(() => {
    writeSetting(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  const price = parseAmount(priceText)
  const liters = parseAmount(literText)
  const deliveryPerLiter = parseAmount(deliveryText)
  const consumptionPercent = parseAmount(consumptionText)
  const breakdown = useMemo(() => {
    if (price === null || liters === null || deliveryPerLiter === null || consumptionPercent === null) {
      return null
    }
    return calculateBreakdown(liters, price, deliveryPerLiter, consumptionPercent / 100)
  }, [consumptionPercent, deliveryPerLiter, liters, price])

  useEffect(() => {
    if (!edited || !breakdown || consumptionPercent === null) return
    const timer = window.setTimeout(() => {
      setHistory((current) => rememberCalculation(current, breakdown, consumptionPercent))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [breakdown, consumptionPercent, edited])

  const edit =
    <T,>(update: (value: T) => void) =>
    (value: T) => {
      setEdited(true)
      update(value)
    }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-safe pb-safe">
      {screen === 'calc' ? (
        <>
          <header className="flex items-center gap-3 pt-5">
            <h1 className="shrink-0 text-4xl font-semibold tracking-tight">軽油税</h1>
            <div className="flex gap-2">
              <button
                type="button"
                className="ui h-12 rounded-2xl bg-surface px-4"
                onClick={() => setScreen('settings')}
              >
                設定
              </button>
              <button
                type="button"
                className="ui h-12 rounded-2xl bg-surface px-4"
                onClick={() => setScreen('history')}
              >
                履歴
              </button>
            </div>
          </header>

          <div className="mt-4 space-y-2">
            <Field id="price" label="税込単価" value={priceText} unit="円/ℓ" onChange={edit(setPriceText)} large compact />
            <Field id="liters" label="数量" value={literText} unit="ℓ" onChange={edit(setLiterText)} large compact />
          </div>

          <section className="mt-3" aria-live="polite">
            {breakdown ? (
              <Result breakdown={breakdown} />
            ) : (
              <div className="rounded-3xl bg-card px-5 py-8 text-lg text-muted">
                単価、数量、設定の税額を入力すると内訳を出します。
              </div>
            )}
          </section>
        </>
      ) : null}

      {screen === 'settings' ? (
        <>
          <ScreenHeader title="設定" onBack={() => setScreen('calc')} />
          <div className="mt-5 space-y-3">
            <Field
              id="delivery-tax"
              label="軽油税"
              value={deliveryText}
              unit="円/ℓ"
              onChange={edit(setDeliveryText)}
              matchResult
            />
            <Field
              id="consumption-tax"
              label="消費税"
              value={consumptionText}
              unit="%"
              onChange={edit(setConsumptionText)}
              matchResult
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DELIVERY_PRESETS.map((value) => {
              const selected = deliveryPerLiter === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  className={`ui h-14 rounded-2xl tabular-nums ${selected ? 'bg-fuel text-bg' : 'bg-surface text-ink'}`}
                  onClick={() => {
                    if (String(value) === deliveryText) return
                    edit(setDeliveryText)(String(value))
                  }}
                >
                  {value}円/ℓ
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {screen === 'history' ? (
        <>
          <ScreenHeader title="履歴" onBack={() => setScreen('calc')} />
          <HistoryList
            history={history}
            onOpen={(entry) => {
              setEdited(false)
              setPriceText(formatQuantity(entry.pricePerLiter))
              setLiterText(formatQuantity(entry.liters))
              setDeliveryText(formatQuantity(entry.deliveryPerLiter))
              setConsumptionText(formatQuantity(entry.consumptionPercent))
              setScreen('calc')
            }}
            onDelete={(id) => setHistory((current) => current.filter((entry) => entry.id !== id))}
          />
        </>
      ) : null}
    </main>
  )
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3 pt-5">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <button
        type="button"
        className="ui inline-flex h-14 shrink-0 items-center rounded-2xl bg-fuel px-5 text-bg"
        onClick={onBack}
      >
        戻る
      </button>
    </header>
  )
}

function Result({ breakdown }: { breakdown: DieselBreakdown }) {
  const figures = [
    {
      key: 'payment',
      label: '支払額',
      yen: breakdown.paymentYen,
      accent: 'border-fuel',
      note: `${formatQuantity(breakdown.pricePerLiter)}円/ℓ × ${formatQuantity(breakdown.liters)}ℓ`,
    },
    {
      key: 'body',
      label: '本体価格',
      yen: breakdown.bodyYen,
      accent: 'border-body',
      note: '',
    },
    {
      key: 'delivery',
      label: '軽油税',
      yen: breakdown.deliveryYen,
      accent: 'border-delivery',
      note: `${formatQuantity(breakdown.liters)}ℓ × ${formatQuantity(breakdown.deliveryPerLiter)}円`,
    },
    {
      key: 'consumption',
      label: '消費税',
      yen: breakdown.consumptionYen,
      accent: 'border-consumption',
      note: `${formatQuantity(breakdown.consumptionRate * 100)}%`,
    },
  ]

  return (
    <div className="space-y-3">
      {figures.map((figure) => (
        <article
          key={figure.key}
          className={`flex items-center justify-between gap-4 rounded-3xl border-l-4 bg-card px-5 py-4 ${figure.accent}`}
        >
          <div className="min-w-0">
            <h2 className="text-2xl text-muted">{figure.label}</h2>
            {figure.note ? <p className="mt-1 text-xl text-muted">{figure.note}</p> : null}
          </div>
          <p className="shrink-0 text-right">
            <span className="text-4xl font-semibold tabular-nums tracking-tight">{formatNumber(figure.yen)}</span>
            <span className="ml-1 text-2xl text-muted">円</span>
          </p>
        </article>
      ))}
      {breakdown.bodyYen < 0 ? (
        <p className="text-lg text-danger">単価が税額を下回っているため、本体価格がマイナスです。</p>
      ) : null}
    </div>
  )
}

function HistoryList({
  history,
  onOpen,
  onDelete,
}: {
  history: HistoryEntry[]
  onOpen: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="mt-5">
      {history.length === 0 ? (
        <p className="text-lg text-muted">計算すると、ここに残ります。</p>
      ) : (
        <ul className="space-y-2">
          {history.map((entry) => (
            <li key={entry.id} className="relative rounded-2xl bg-card">
              <button type="button" className="w-full px-4 py-4 pr-24 text-left" onClick={() => onOpen(entry)}>
                <p className="text-2xl">{formatHistoryDate(entry.month, entry.day)}</p>
                <p className="mt-1 text-2xl tabular-nums">
                  {formatQuantity(entry.pricePerLiter)}円/ℓ × {formatQuantity(entry.liters)}ℓ
                </p>
                <p className="mt-1 text-xl leading-relaxed text-muted tabular-nums">
                  軽油税 {formatYen(entry.deliveryYen)}
                </p>
                <p className="text-xl leading-relaxed text-muted tabular-nums">消費税 {formatYen(entry.consumptionYen)}</p>
                <p className="text-xl leading-relaxed text-muted tabular-nums">本体価格 {formatYen(entry.bodyYen)}</p>
              </button>
              <button
                type="button"
                className="ui absolute top-3 right-3 rounded-xl bg-surface px-4 py-2 text-ink"
                onClick={() => onDelete(entry.id)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Field({
  id,
  label,
  value,
  unit,
  onChange,
  large = false,
  matchResult = false,
  compact = false,
}: {
  id: string
  label: string
  value: string
  unit: string
  onChange: (value: string) => void
  large?: boolean
  matchResult?: boolean
  compact?: boolean
}) {
  return (
    <div className={`rounded-2xl bg-card px-4 ${compact ? 'flex items-center gap-3 py-1.5' : 'py-4'}`}>
      <label htmlFor={id} className={`shrink-0 text-2xl text-muted ${compact ? '' : 'block'}`}>
        {label}
      </label>
      <div className={`flex min-w-0 flex-1 items-baseline gap-2 ${compact ? '' : 'mt-1'}`}>
        <input
          id={id}
          {...numberInputProps}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full bg-transparent text-right tabular-nums outline-none ${matchResult ? 'num-xl' : large ? 'num-lg' : ''}`}
        />
        <span className="shrink-0 text-2xl text-muted">{unit}</span>
      </div>
    </div>
  )
}



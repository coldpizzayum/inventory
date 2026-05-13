import { useState, useEffect } from 'react'

const OPERATOR_KEY = 'dicas:operator'
function loadOperator() {
  try { return localStorage.getItem(OPERATOR_KEY) || null } catch { return null }
}
function saveOperator(name) {
  try { localStorage.setItem(OPERATOR_KEY, name) } catch {}
}

const OPERATORS = [
  { name: '阿明', role: '現場主管' },
  { name: '小芳', role: '倉務' },
  { name: '阿勗', role: '倉務' },
  { name: '小林', role: '品管' },
]

function darken(hex, amt = 0.88) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.floor(((n >> 16) & 255) * amt))
  const g = Math.max(0, Math.floor(((n >> 8) & 255) * amt))
  const b = Math.max(0, Math.floor((n & 255) * amt))
  return `rgb(${r},${g},${b})`
}

const WORKER_ACTIONS = [
  {
    key: '進貨', apiKey: 'receive',
    sub: '從加工廠收料入庫', color: '#2E7D32',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21l-8 -4.5v-9l8 -4.5l8 4.5v4.5" />
        <path d="M12 12l8 -4.5M12 12v9M12 12l-8 -4.5M22 18h-7M18 15l-3 3l3 3" />
      </svg>
    ),
  },
  {
    key: '送出加工', apiKey: 'send',
    sub: '出貨給加工廠加工', color: '#1565C0',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5" />
      </svg>
    ),
  },
  {
    key: '回廠', apiKey: 'return',
    sub: '加工完成回到工廠', color: '#E64A19',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21l-8 -4.5v-9l8 -4.5l8 4.5v4.5" />
        <path d="M12 12l8 -4.5M12 12v9M12 12l-8 -4.5M15 18h7M19 15l3 3l-3 3" />
      </svg>
    ),
  },
  {
    key: '大貨出貨', apiKey: 'ship',
    sub: '成品出給品牌客戶', color: '#6A1B9A',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1" />
        <path d="M4 18l-1.5 -5h19l-2 4M5 13v-6h8l4 6M7 7v-4h-1" />
      </svg>
    ),
  },
]

function actionMeta(key) {
  return WORKER_ACTIONS.find(a => a.key === key) || WORKER_ACTIONS[0]
}

// ─── Step indicator ───────────────────────────────────────────
function StepBar({ step }) {
  const labels = ['選動作', '選零件', '輸入數量']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: 'var(--bg-1)', borderBottom: '1px solid var(--line-1)' }}>
      {labels.map((l, i) => {
        const done = i + 1 < step, active = i + 1 === step
        return (
          <>
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 13,
                background: done ? 'var(--ok)' : active ? 'var(--accent)' : 'transparent',
                color: done || active ? '#fff' : 'var(--text-4)',
                border: `1.5px solid ${done ? 'var(--ok)' : active ? 'var(--accent)' : 'var(--line-2)'}`,
              }}>
                {done
                  ? <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--text-1)' : 'var(--text-4)' }}>{l}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: done ? 'var(--ok)' : 'var(--line-1)' }} />}
          </>
        )
      })}
    </div>
  )
}

// ─── Color-band action card ───────────────────────────────────
function ActionCard({ action, selected, onPick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => onPick(action.key)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 0, background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 12,
        cursor: 'pointer', overflow: 'hidden', textAlign: 'left',
        display: 'flex', flexDirection: 'column',
        transform: hover ? 'scale(1.01)' : 'scale(1)',
        transition: 'transform .12s ease',
        fontFamily: 'inherit',
      }}
    >
      <div style={{
        height: 72, background: hover ? darken(action.color) : action.color,
        color: '#fff', display: 'grid', placeItems: 'center',
        position: 'relative', transition: 'background .12s',
      }}>
        {action.icon}
        {selected && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 22, height: 22, borderRadius: 11,
            background: '#fff', color: action.color,
            display: 'grid', placeItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1A1A1A', letterSpacing: '-0.005em' }}>{action.key}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{action.sub}</div>
      </div>
    </button>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────
function StepAction({ value, onPick }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12, fontWeight: 500 }}>選擇要登記的動作</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {WORKER_ACTIONS.map(a => (
          <ActionCard key={a.key} action={a} selected={value === a.key} onPick={onPick} />
        ))}
      </div>
    </div>
  )
}

// ─── Pill button ──────────────────────────────────────────────
function Pill({ active, onClick, color = 'var(--accent)', children, big }) {
  return (
    <button onClick={onClick} style={{
      border: `1.5px solid ${active ? color : 'var(--line-2)'}`,
      background: active ? color : 'var(--bg-1)',
      color: active ? '#fff' : 'var(--text-1)',
      padding: big ? '14px 20px' : '10px 16px',
      borderRadius: 999,
      cursor: 'pointer',
      fontSize: big ? 17 : 15,
      fontWeight: active ? 600 : 500,
      display: 'inline-flex', alignItems: 'center', gap: 10,
      transition: 'all .12s',
      fontFamily: 'inherit',
    }}>{children}</button>
  )
}

// ─── SKU color dot ─────────────────────────────────────────────
const SKU_PALETTE = {
  '黑': '#1a1a1a', '白': '#e8e8e8', '紅': '#d63031', '藍': '#2d6ee8',
  '綠': '#27ae60', '黃': '#f39c12', '橘': '#e67e22', '粉': '#e91e8c',
  '灰': '#7f8c8d', '棕': '#795548', '米': '#c8b57a', '紫': '#8e44ad',
  '透明': '#d0d0d0',
}
function SkuDot({ name, size = 14 }) {
  const c = SKU_PALETTE[name] || '#999'
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: c, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)',
    }} />
  )
}

function ColorChip({ color, size = 12 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, background: color, borderRadius: 3, flexShrink: 0 }} />
}

// ─── Step 2: Pick product / part / SKU ───────────────────────
function StepPart({ action, products, onBack, onNext }) {
  const meta = actionMeta(action)
  const [pid, setPid] = useState(products[0]?.id ?? null)
  const [parts, setParts] = useState([])
  const [partId, setPartId] = useState(null)
  const [sku, setSku] = useState('')

  useEffect(() => {
    if (!pid) return
    fetch(`/api/products/${pid}/parts`)
      .then(r => r.json())
      .then(data => {
        setParts(data)
        const first = data[0]
        setPartId(first?.id ?? null)
        setSku(first?.skus?.[0]?.color_name ?? '')
      })
  }, [pid])

  useEffect(() => {
    const part = parts.find(p => p.id === partId)
    if (part) setSku(part.skus?.[0]?.color_name ?? '')
  }, [partId])

  const product = products.find(p => p.id === pid)
  const part = parts.find(p => p.id === partId)
  const needSku = part?.skus?.length > 0
  const canNext = !!(pid && partId && (!needSku || sku))

  function handleNext() {
    if (!canNext) return
    onNext({ productId: pid, productName: product?.name ?? '', partId, partName: part?.name ?? '', sku })
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 100 }}>
      {/* Action context bar */}
      <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ColorChip color={meta.color} size={14} />
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>已選動作</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>{action}</span>
      </div>

      <div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10, fontWeight: 500 }}>選擇產品</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {products.map(p => (
            <Pill key={p.id} big color={meta.color} active={pid === p.id} onClick={() => setPid(p.id)}>{p.name}</Pill>
          ))}
        </div>
      </div>

      {parts.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10, fontWeight: 500 }}>選擇零件</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {parts.map(pt => (
              <Pill key={pt.id} big color={meta.color} active={partId === pt.id} onClick={() => setPartId(pt.id)}>{pt.name}</Pill>
            ))}
          </div>
        </div>
      )}

      {needSku && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10, fontWeight: 500 }}>
            SKU 顏色
            {part.skus.length === 1 && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-4)' }}>· 只有一種，自動選取</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {part.skus.map(s => (
              <Pill key={s.id} big color={meta.color} active={sku === s.color_name} onClick={() => setSku(s.color_name)}>
                <SkuDot name={s.color_name} size={16} />{s.color_name}
              </Pill>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: 16, background: 'var(--bg-0)', borderTop: '1px solid var(--line-1)', display: 'flex', gap: 10 }}>
        <button onClick={onBack} className="btn" style={{ padding: '14px 22px', fontSize: 15, flex: '0 0 auto' }}>← 上一步</button>
        <button
          onClick={handleNext}
          style={{
            padding: '14px 22px', fontSize: 15, flex: 1, justifyContent: 'center',
            background: canNext ? meta.color : 'var(--bg-3)',
            border: `1.5px solid ${canNext ? meta.color : 'var(--line-2)'}`,
            color: canNext ? '#fff' : 'var(--text-4)',
            fontWeight: 600, borderRadius: 8,
            cursor: canNext ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'inherit',
          }}>下一步 →</button>
      </div>
    </div>
  )
}

// ─── Keypad ───────────────────────────────────────────────────
function Keypad({ value, onChange, accent }) {
  const keys = ['7','8','9','4','5','6','1','2','3','00','0','⌫']
  function press(k) {
    if (k === '⌫') { onChange(value.slice(0, -1)); return }
    if (value.length >= 6) return
    onChange((value === '0' ? '' : value) + k)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {keys.map(k => (
        <button key={k} onClick={() => press(k)} style={{
          height: 60, fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 600,
          border: '0.5px solid #EBEBEB',
          background: k === '⌫' ? 'var(--bg-2)' : '#fff',
          color: k === '⌫' ? accent : 'var(--text-1)',
          borderRadius: 8, cursor: 'pointer', transition: 'background .1s',
        }}
        onMouseDown={e => { e.currentTarget.style.background = 'var(--bg-3)' }}
        onMouseUp={e => { e.currentTarget.style.background = k === '⌫' ? 'var(--bg-2)' : '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = k === '⌫' ? 'var(--bg-2)' : '#fff' }}>
          {k}
        </button>
      ))}
    </div>
  )
}

// ─── Step 3: Enter quantity ───────────────────────────────────
function StepQty({ action, picks, onBack, onConfirm, submitting }) {
  const meta = actionMeta(action)
  const [qty, setQty] = useState('')
  const [hasDefect, setHasDefect] = useState(false)
  const [defect, setDefect] = useState('')

  function handleConfirm() {
    if (!qty || submitting) return
    onConfirm({ qty: parseInt(qty), defect: hasDefect ? parseInt(defect || '0') : 0 })
  }

  return (
    <div style={{ padding: 20, paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary bar */}
      <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ background: meta.color, color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>{action}</span>
        <span style={{ color: 'var(--text-4)' }}>›</span>
        <span style={{ fontWeight: 600 }}>{picks.productName}</span>
        <span style={{ color: 'var(--text-4)' }}>›</span>
        <span>{picks.partName}</span>
        {picks.sku && (
          <>
            <span style={{ color: 'var(--text-4)' }}>›</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><SkuDot name={picks.sku} />{picks.sku}</span>
          </>
        )}
      </div>

      {/* Big number + keypad */}
      <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>數量</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, height: 64, marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 58, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: qty ? 'var(--text-1)' : 'var(--text-4)' }}>
            {qty || '0'}
          </div>
          <div style={{ fontSize: 17, color: 'var(--text-3)' }}>件</div>
        </div>
        <Keypad value={qty} onChange={setQty} accent={meta.color} />
      </div>

      {/* Defect toggle */}
      <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>有不良品</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>需要記錄不良品數量時開啟</div>
          </div>
          <button onClick={() => setHasDefect(v => !v)} style={{
            width: 52, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer', padding: 0,
            background: hasDefect ? 'var(--bad)' : 'var(--bg-3)',
            position: 'relative', transition: 'background .15s',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: hasDefect ? 25 : 3,
              width: 24, height: 24, borderRadius: 12, background: '#fff',
              transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
        {hasDefect && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, height: 54, marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: defect ? 'var(--bad)' : 'var(--text-4)' }}>
                {defect || '0'}
              </div>
              <div style={{ fontSize: 15, color: 'var(--text-3)' }}>件不良</div>
            </div>
            <Keypad value={defect} onChange={setDefect} accent="var(--bad)" />
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: 16, background: 'var(--bg-0)', borderTop: '1px solid var(--line-1)', display: 'flex', gap: 10 }}>
        <button onClick={onBack} className="btn" style={{ padding: '14px 22px', fontSize: 15, flex: '0 0 auto' }}>← 上一步</button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '14px 22px', fontSize: 15, flex: 1, justifyContent: 'center',
            background: meta.color, border: `1.5px solid ${meta.color}`,
            color: '#fff', fontWeight: 600, borderRadius: 8,
            cursor: qty && !submitting ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            opacity: qty && !submitting ? 1 : 0.4,
            fontFamily: 'inherit',
          }}>{submitting ? '登記中...' : '下一步 →'}</button>
      </div>
    </div>
  )
}

// ─── Done screen ──────────────────────────────────────────────
function StepConfirm({ action, picks, qtys, onSame, onNew }) {
  const meta = actionMeta(action)
  const rows = [
    { l: '動作', v: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ColorChip color={meta.color} size={12} />{action}</span> },
    { l: '產品', v: picks.productName },
    { l: '零件', v: picks.partName },
    ...(picks.sku ? [{ l: 'SKU', v: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><SkuDot name={picks.sku} size={14} />{picks.sku}</span> }] : []),
    { l: '數量', v: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: meta.color }}>{qtys.qty.toLocaleString()} 件</span> },
  ]
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 100 }}>
      <div style={{ textAlign: 'center', padding: '20px 0 4px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: meta.color, display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>登記成功</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {new Date().toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit' })} · 已存入系統
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < rows.length - 1 ? 10 : 0, borderBottom: i < rows.length - 1 ? '1px solid var(--line-1)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em' }}>{row.l}</span>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{row.v}</span>
          </div>
        ))}
        {qtys.defect > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--bad)', paddingTop: 10, borderTop: '1px solid var(--line-1)' }}>
            <span style={{ fontSize: 12, letterSpacing: '0.04em' }}>不良品</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>{qtys.defect} 件</span>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: 16, background: 'var(--bg-0)', borderTop: '1px solid var(--line-1)', display: 'flex', gap: 10 }}>
        <button onClick={onSame} className="btn" style={{ padding: '14px 18px', fontSize: 14, flex: 1, justifyContent: 'center' }}>相同零件繼續</button>
        <button onClick={onNew} style={{
          padding: '14px 18px', fontSize: 14, flex: 1, justifyContent: 'center',
          background: meta.color, border: `1.5px solid ${meta.color}`,
          color: '#fff', fontWeight: 600, borderRadius: 8,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: 'inherit',
        }}>新登記</button>
      </div>
    </div>
  )
}

// ─── Worker header ────────────────────────────────────────────
function WorkerHeader({ operator, onSwitch }) {
  return (
    <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-1)', borderBottom: '1px solid var(--line-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/dicas-logo.svg" alt="DiCAS" style={{ height: 26, width: 'auto', display: 'block' }} />
        <div style={{ fontSize: 14, fontWeight: 700 }}>進出貨登記</div>
      </div>
      {operator && (
        <button onClick={onSwitch} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-0)', border: '1px solid var(--line-1)', borderRadius: 999, cursor: 'pointer', font: 'inherit' }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: '#E8461A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{operator.slice(0, 1)}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{operator}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>切換</span>
        </button>
      )}
    </div>
  )
}

// ─── Operator picker ──────────────────────────────────────────
function OperatorPicker({ onPick, dismissable, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.45)', display: 'grid', placeItems: 'center', zIndex: 200, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460, background: 'var(--bg-0)', borderRadius: 18, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>你是誰？</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>選擇今天的登記人，之後所有動作都會記在名下</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {OPERATORS.map(op => (
            <button key={op.name} onClick={() => onPick(op.name)} style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 14, padding: '18px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', font: 'inherit', transition: 'border-color .12s, background .12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8461A'; e.currentTarget.style.background = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-1)'; e.currentTarget.style.background = 'var(--bg-1)' }}>
              <span style={{ width: 44, height: 44, borderRadius: 999, background: '#E8461A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700 }}>{op.name.slice(0, 1)}</span>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{op.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{op.role}</div>
            </button>
          ))}
        </div>
        {dismissable && (
          <button onClick={onDismiss} style={{ background: 'transparent', border: 'none', padding: 6, fontSize: 13, color: 'var(--text-3)', cursor: 'pointer', font: 'inherit' }}>取消</button>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────
export default function Input() {
  const [step, setStep] = useState(1)
  const [action, setAction] = useState(null)
  const [picks, setPicks] = useState(null)
  const [qtys, setQtys] = useState(null)
  const [done, setDone] = useState(false)
  const [products, setProducts] = useState([])
  const [operator, setOperator] = useState(() => loadOperator())
  const [switching, setSwitching] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {})
  }, [])

  function reset() { setStep(1); setAction(null); setPicks(null); setQtys(null); setDone(false) }
  function sameAgain() { setQtys(null); setDone(false); setStep(3) }
  function pickOperator(name) { setOperator(name); saveOperator(name); setSwitching(false) }

  async function confirm(qData) {
    const meta = actionMeta(action)
    setSubmitting(true)
    try {
      await fetch('/api/receive-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: picks.productId,
          part_id: picks.partId,
          sku_color: picks.sku || '',
          action_type: meta.apiKey,
          qty: qData.qty,
          defect_qty: qData.defect || 0,
          note: '',
        }),
      })
      setQtys(qData)
      setDone(true)
    } catch (e) {
      alert('送出失敗：' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const showPicker = !operator || switching

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)', position: 'relative' }}>
      <WorkerHeader operator={operator} onSwitch={() => setSwitching(true)} />
      {!done && <StepBar step={step} />}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {!done && step === 1 && (
          <StepAction value={action} onPick={a => { setAction(a); setStep(2) }} />
        )}
        {!done && step === 2 && (
          <StepPart
            action={action}
            products={products}
            onBack={() => setStep(1)}
            onNext={p => { setPicks(p); setStep(3) }}
          />
        )}
        {!done && step === 3 && picks && (
          <StepQty
            action={action}
            picks={picks}
            onBack={() => setStep(2)}
            onConfirm={confirm}
            submitting={submitting}
          />
        )}
        {done && qtys && (
          <StepConfirm
            action={action}
            picks={picks}
            qtys={qtys}
            onSame={sameAgain}
            onNew={reset}
          />
        )}
      </div>
      {showPicker && (
        <OperatorPicker
          onPick={pickOperator}
          dismissable={!!operator}
          onDismiss={() => setSwitching(false)}
        />
      )}
    </div>
  )
}

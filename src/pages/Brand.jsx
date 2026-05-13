import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const STATUS_MAP = {
  '等待中':   { cls: 'wait',    label: '等待中' },
  '送加工廠': { cls: 'send',    label: '送加工廠' },
  '加工中':   { cls: 'process', label: '加工中' },
  '回廠中':   { cls: 'back',    label: '回廠中' },
  '包裝中':   { cls: 'pack',    label: '包裝中' },
  '完成':     { cls: 'done',    label: '完成' },
}

const STATUS_ORDER = ['等待中', '送加工廠', '加工中', '回廠中', '包裝中', '完成']

function statusCls(s) {
  return (STATUS_MAP[s] || STATUS_MAP['等待中']).cls
}

function BBadge({ status }) {
  const cls = statusCls(status)
  return <span className={`badge ${cls}`}><span className="dot" />{status || '等待中'}</span>
}

function BrandHeader({ showBack, onBack, label }) {
  return (
    <div style={{ padding: '16px 18px 14px', background: 'var(--bg-1)', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {showBack ? (
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: 14, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2L4 7l5 5"/></svg>
          我的產品
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/dicas-logo.svg" alt="DICAS" style={{ height: 18, width: 'auto', display: 'block' }} />
          {label && (
            <>
              <div style={{ width: 1, height: 18, background: 'var(--line-2)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PartRow({ part }) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line-1)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: part.sku_progress?.length ? 10 : 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{part.name}</div>
        </div>
        <BBadge status={part.status} />
      </div>
      {part.sku_progress?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {part.sku_progress.map((s, i) => (
            <span key={i} className={`badge ${statusCls(s.status)}`} style={{ fontSize: 11, padding: '3px 8px' }}>
              <span className="dot" />{s.color_name} · {s.status}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single product view ──────────────────────────────────────
function ProductView({ product, label, parts, onBack }) {
  const overallStatus = deriveOverallStatus(parts)
  const [imgSrc, setImgSrc] = useState(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`prod-img-${product.id}`)
      if (stored) setImgSrc(stored)
    } catch {}
  }, [product.id])

  const BRAND_COLORS = ['#4A6FA5', '#7A9E7E', '#C4956A', '#8B7BA8', '#B07070']
  const brandColor = BRAND_COLORS[product.id % BRAND_COLORS.length] || '#8B9EA8'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
      <BrandHeader showBack={!!onBack} onBack={onBack} label={label} />

      {/* Product hero */}
      <div style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', background: brandColor, overflow: 'hidden' }}>
          {imgSrc
            ? <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 48, fontWeight: 600, opacity: 0.5 }}>
                {product.name?.slice(0, 2)}
              </div>
          }
        </div>
        <div style={{ padding: '14px 18px 16px' }}>
          <div className="tag">產品</div>
          <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{product.name}</h1>
          {product.description && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: 'var(--text-3)', paddingBottom: 2 }}>
              <span>{product.description}</span>
              {product.estimated_completion && <><span>·</span><span className="num">預計完成 {product.estimated_completion}</span></>}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { l: '訂單日期', v: product.order_date || '-' },
          { l: '預計完成', v: product.estimated_completion || '待確認', accent: !!product.estimated_completion },
          { l: '零件數', v: parts.length },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 8, padding: '10px 12px' }}>
            <div className="tag" style={{ fontSize: 9, marginBottom: 3 }}>{s.l}</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, color: s.accent ? 'var(--accent)' : 'var(--text-1)' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Overall status */}
      <div style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="tag">整體狀態</div>
        <BBadge status={overallStatus} />
      </div>

      {/* Parts list */}
      <div style={{ flex: 1, background: 'var(--bg-1)', borderTop: '1px solid var(--line-1)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ padding: '10px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="tag">零件進度</div>
          <span className="num" style={{ fontSize: 11, color: 'var(--text-3)' }}>{parts.length} 項</span>
        </div>
        {parts.map(part => <PartRow key={part.id} part={part} />)}
      </div>

      <div style={{ padding: '14px 18px 24px', background: 'var(--bg-0)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>此頁面為唯讀視圖 · 僅顯示被指派產品的加工狀態</p>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────
export default function Brand() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(!token ? '連結格式不正確，請確認您的設計師連結是否完整。' : null)
  const [loading, setLoading] = useState(!!token)

  useEffect(() => {
    if (!token) return
    fetch(`/api/brand/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('無效的設計師連結')
        return r.json()
      })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--bg-0)' }}>
        <div style={{ color: 'var(--text-4)', fontSize: 14 }}>載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--bad-tint)', display: 'grid', placeItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>連結無效</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{error}</div>
      </div>
    )
  }

  const { product, label, parts } = data

  return (
    <ProductView
      product={product}
      label={label}
      parts={parts || []}
      onBack={null}
    />
  )
}

function deriveOverallStatus(parts) {
  if (!parts || parts.length === 0) return '等待中'
  const indices = parts.map(p => STATUS_ORDER.indexOf(p.status || '等待中')).filter(i => i >= 0)
  if (indices.length === 0) return '等待中'
  return STATUS_ORDER[Math.min(...indices)] || '等待中'
}

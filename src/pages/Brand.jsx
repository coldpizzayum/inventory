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

function BrandHeader({ brandName }) {
  return (
    <div style={{ padding: '16px 18px 14px', background: 'var(--bg-1)', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="/dicas-logo.svg" alt="DICAS" style={{ height: 18, width: 'auto', display: 'block' }} />
      {brandName && (
        <>
          <div style={{ width: 1, height: 18, background: 'var(--line-2)' }} />
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{brandName}</div>
        </>
      )}
    </div>
  )
}

function PartRow({ part }) {
  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-1)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: part.sku_progress?.length ? 8 : 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{part.name}</div>
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

function deriveOverallStatus(parts) {
  if (!parts || parts.length === 0) return '等待中'
  const indices = parts.map(p => STATUS_ORDER.indexOf(p.status || '等待中')).filter(i => i >= 0)
  if (indices.length === 0) return '等待中'
  return STATUS_ORDER[Math.min(...indices)] || '等待中'
}

function ProductCard({ item }) {
  const { product, parts } = item
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
    <div style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--line-1)' }}>
      {/* Product hero */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: brandColor, overflow: 'hidden' }}>
        {imgSrc
          ? <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 40, fontWeight: 600, opacity: 0.4 }}>
              {product.name?.slice(0, 2)}
            </div>
        }
      </div>

      {/* Product info */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--line-1)' }}>
        <div className="tag" style={{ marginBottom: 4 }}>產品</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{product.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BBadge status={overallStatus} />
          {product.estimated_completion && (
            <span className="num" style={{ fontSize: 12, color: 'var(--text-3)' }}>預計完成 {product.estimated_completion}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderBottom: '1px solid var(--line-1)' }}>
        {[
          { l: '訂單日期', v: product.order_date || '-' },
          { l: '零件數', v: parts.length },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-0)', border: '1px solid var(--line-1)', borderRadius: 8, padding: '8px 12px' }}>
            <div className="tag" style={{ fontSize: 9, marginBottom: 2 }}>{s.l}</div>
            <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Parts */}
      <div style={{ paddingTop: 4 }}>
        <div style={{ padding: '8px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="tag">零件進度</div>
          <span className="num" style={{ fontSize: 11, color: 'var(--text-3)' }}>{parts.length} 項</span>
        </div>
        {parts.map(part => <PartRow key={part.id} part={part} />)}
      </div>
    </div>
  )
}

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

  const { brand_name, products } = data

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
      <BrandHeader brandName={brand_name} />

      {products.length === 0 ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--text-4)', fontSize: 14 }}>
          尚未指派任何產品
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {products.map((item, i) => (
            <ProductCard key={item.product.id || i} item={item} />
          ))}
        </div>
      )}

      <div style={{ padding: '14px 18px 24px', background: 'var(--bg-0)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>此頁面為唯讀視圖 · 僅顯示被指派產品的加工狀態</p>
      </div>
    </div>
  )
}

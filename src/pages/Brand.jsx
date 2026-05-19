import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const PRODUCT_STATUS = {
  '加工中':   { bg: '#FEE9E4', color: '#E8461A' },
  '包裝中':   { bg: '#FEF3CD', color: '#B07D00' },
  '送加工廠': { bg: '#E6F0FB', color: '#1A5FAD' },
  '完成':     { bg: '#E6F4EC', color: '#1A7A3C' },
  '等待中':   { bg: '#F1EFE8', color: '#5F5E5A' },
}

const PART_STATUS = {
  '備料中': { bg: '#F1EFE8', color: '#5F5E5A' },
  '加工中': { bg: '#FEE9E4', color: '#E8461A' },
  '已回廠': { bg: '#E6F0FB', color: '#1A5FAD' },
  '完成':   { bg: '#EAF3DE', color: '#27500A' },
  '等待中': { bg: '#F1EFE8', color: '#5F5E5A' },
}

function Dot({ color }) {
  return <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

function Topbar({ brandName, productCount }) {
  return (
    <div style={{
      padding: '12px 16px', background: '#fff',
      borderBottom: '0.5px solid #EBEBEB',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15, background: '#E8461A', color: '#fff',
          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0,
        }}>
          {brandName?.slice(0, 1) || '品'}
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{brandName}</span>
      </div>
      <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4 }}>
        {productCount} 個產品合作中
      </span>
    </div>
  )
}

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid #EBEBEB', background: '#fff', position: 'sticky', top: 55, zIndex: 9 }}>
      {['產品總覽', '訂單追蹤'].map(tab => (
        <button key={tab} onClick={() => onChange(tab)} style={{
          flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
          color: active === tab ? '#1A1A1A' : '#888',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: active === tab ? '2px solid #E8461A' : '2px solid transparent',
          transition: 'color 0.1s',
        }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

function OrderBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1A1A1A 0%, #3A3A3A 100%)',
      borderRadius: 12, padding: '12px 14px', marginBottom: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <span style={{
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 3,
          display: 'inline-block', marginBottom: 4,
        }}>開發中</span>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 2 }}>線上下單</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>即將推出・直接在 App 內下訂單</div>
      </div>
      <div title="即將推出" style={{
        background: '#E8461A', opacity: 0.65, borderRadius: 8, padding: '7px 13px',
        display: 'flex', alignItems: 'center', gap: 5,
        cursor: 'not-allowed', color: '#fff', fontSize: 13, fontWeight: 500, flexShrink: 0,
      }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        下單
      </div>
    </div>
  )
}

function PartRow({ part }) {
  const cfg = PART_STATUS[part.status] || PART_STATUS['等待中']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: '#1A1A1A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {part.name}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        {part.skus?.map((sku, i) => (
          <span key={i} title={sku.color_name} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: sku.color_hex || '#CCCCCC',
            border: '0.5px solid rgba(0,0,0,0.1)',
            display: 'inline-block', flexShrink: 0,
          }} />
        ))}
        <span style={{
          background: cfg.bg, color: cfg.color,
          fontSize: 9, fontWeight: 500, padding: '2px 5px', borderRadius: 3, marginLeft: 2,
        }}>
          {part.status}
        </span>
      </div>
    </div>
  )
}

function ProductCard({ item, orders = [], defaultExpanded }) {
  const { product, parts, overallStatus } = item
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [imgSrc, setImgSrc] = useState(product.image_url || null)

  useEffect(() => {
    if (!imgSrc) {
      try {
        const stored = localStorage.getItem(`prod-img-${product.id}`)
        if (stored) setImgSrc(stored)
      } catch {}
    }
  }, [product.id])

  const cfg = PRODUCT_STATUS[overallStatus] || PRODUCT_STATUS['等待中']
  const activeOrders = orders.filter(o => o.product_id === product.id && (o.completed_qty || 0) < (o.target_qty || 0))
  const stock = product.warehouse_stock || 0

  return (
    <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 12, overflow: 'hidden' }}>
      {/* Image */}
      <div style={{ height: 110, position: 'relative', overflow: 'hidden' }}>
        {imgSrc
          ? <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: '#E8461A', display: 'grid', placeItems: 'center' }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>{product.name?.slice(0, 1)}</span>
            </div>
        }
        <span style={{
          position: 'absolute', bottom: 6, left: 6,
          background: cfg.bg, color: cfg.color,
          fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4,
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          <Dot color={cfg.color} />
          {overallStatus}
        </span>
      </div>

      {/* Name */}
      <div style={{ padding: '8px 10px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </div>
      </div>

      {/* Stats — stock + active orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, padding: '8px 10px 10px' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.1 }}>
            {stock.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>倉庫庫存</div>
        </div>
        <div style={{ borderLeft: '0.5px solid #EBEBEB', paddingLeft: 12 }}>
          <div style={{
            fontSize: 18, fontWeight: 700, lineHeight: 1.1,
            color: activeOrders.length > 0 ? '#E8461A' : '#AAAAAA',
          }}>
            {activeOrders.length}
          </div>
          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>進行中訂單</div>
        </div>
      </div>

      {/* Parts toggle */}
      {parts.length > 0 && (
        <>
          <div onClick={() => setExpanded(e => !e)} style={{
            borderTop: '0.5px solid #F0EFE8', padding: '5px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/>
                <rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/>
              </svg>
              <span style={{ fontSize: 11, color: '#888' }}>{parts.length} 個零件</span>
            </div>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {expanded && (
            <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {parts.map(part => <PartRow key={part.id} part={part} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductsTab({ products, orders }) {
  if (products.length === 0) {
    return <div style={{ padding: '60px 14px', textAlign: 'center', color: '#888', fontSize: 13 }}>尚未指派任何產品</div>
  }
  return (
    <div style={{ padding: '12px 14px' }}>
      <OrderBanner />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {products.map((item, i) => (
          <ProductCard key={item.product.id || i} item={item} orders={orders} defaultExpanded={i === 0} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order }) {
  const total = order.target_qty || 0
  const completed = order.completed_qty || 0
  const remaining = Math.max(0, total - completed)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const barColor = pct >= 80 ? '#1A7A3C' : pct >= 30 ? '#BA7517' : '#E8461A'

  let dueDisplay = '—'
  if (order.due_date) {
    const d = new Date(order.due_date)
    if (!isNaN(d)) dueDisplay = `${d.getMonth() + 1}/${d.getDate()}`
  }

  let createdDisplay = '—'
  if (order.created_at) {
    const d = new Date(order.created_at)
    if (!isNaN(d)) createdDisplay = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  let statusLabel = '進行中', statusBg = '#FEF3CD', statusColor = '#B07D00'
  if (pct >= 100) { statusLabel = '完成'; statusBg = '#EAF3DE'; statusColor = '#27500A' }
  else if (pct >= 80) { statusLabel = '接近完成'; statusBg = '#E6F0FB'; statusColor = '#1A5FAD' }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #EBEBEB', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #F0EFE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{order.product_name || '—'}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>訂單日 {createdDisplay}</div>
        </div>
        <span style={{ background: statusBg, color: statusColor, fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4 }}>
          {statusLabel}
        </span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: barColor }}>{pct}%</span>
          <span style={{ fontSize: 12, color: '#888' }}>已完成 / 總量 {total.toLocaleString()}</span>
        </div>
        <div style={{ height: 6, background: '#F0EFE8', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 3 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: '訂單總量', value: total.toLocaleString(), color: '#1A1A1A' },
            { label: '已完成', value: completed.toLocaleString(), color: '#1A7A3C' },
            { label: '剩餘', value: remaining.toLocaleString(), color: '#1A1A1A' },
            { label: '預計完成', value: dueDisplay, color: '#1A1A1A' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 1 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OrdersTab({ orders }) {
  if (!orders || orders.length === 0) {
    return <div style={{ padding: '40px 14px', textAlign: 'center', color: '#888', fontSize: 13 }}>目前沒有訂單記錄</div>
  }
  return (
    <div style={{ padding: '12px 14px' }}>
      {orders.map(order => <OrderCard key={order.id} order={order} />)}
    </div>
  )
}

export default function Brand() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(!token ? '連結格式不正確，請確認您的設計師連結是否完整。' : null)
  const [loading, setLoading] = useState(!!token)
  const [tab, setTab] = useState('產品總覽')

  useEffect(() => {
    if (!token) return
    fetch(`/api/brand/${token}`)
      .then(r => {
        if (!r.ok) throw new Error('無效的設計師連結')
        return r.json()
      })
      .then(d => { setData(d); document.title = `${d.brand_name} — Inventory OS` })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#F8F7F4' }}>
        <div style={{ color: '#888', fontSize: 14 }}>載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8F7F4', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: '#FEE9E4', display: 'grid', placeItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8461A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>連結無效</div>
        <div style={{ fontSize: 13, color: '#888' }}>{error}</div>
      </div>
    )
  }

  const { brand_name, products, orders = [] } = data

  return (
    <div style={{ minHeight: '100dvh', background: '#F8F7F4' }}>
      <Topbar brandName={brand_name} productCount={products.length} />
      <TabBar active={tab} onChange={setTab} />
      {tab === '產品總覽'
        ? <ProductsTab products={products} orders={orders} />
        : <OrdersTab orders={orders} />
      }
    </div>
  )
}

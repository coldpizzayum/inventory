import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Icons ───────────────────────────────────────────────────
const Icon = {
  Dashboard: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>),
  Flow: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="19" cy="12" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7 11l3-3M14 8l3 3M14 16l3-4M7 13l3 3"/></svg>),
  Stack: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>),
  Log: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>),
  Box: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>),
  Setting: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.4 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.4 1.7 1.7 0 00-1.1 1.6V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.4-1.9 1.7 1.7 0 00-1.6-1.1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.4-1.9L4.2 6.6a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.4h.1a1.7 1.7 0 001.1-1.6V3a2 2 0 114 0v.1a1.7 1.7 0 001.1 1.6 1.7 1.7 0 001.9-.4l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.4 1.9v.1a1.7 1.7 0 001.6 1.1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1.1z"/></svg>),
  Plus: () => (<svg viewBox="0 0 14 14" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>),
  Export: () => (<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 11V2M5 5l3-3 3 3M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/></svg>),
  Warn: () => (<svg viewBox="0 0 14 14" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5l6 11H1l6-11z"/><path d="M7 6v3M7 11h.01"/></svg>),
  Edit: () => (<svg viewBox="0 0 16 16" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8L3 13l.5-2.5 8-8z"/></svg>),
  ChevronLeft: () => (<svg viewBox="0 0 12 12" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 3L4.5 6l3 3"/></svg>),
  X: () => (<svg viewBox="0 0 14 14" fill="none" width="10" height="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>),
  Grip: () => (<svg width="10" height="14" viewBox="0 0 14 14" fill="#B0ADA6"><circle cx="5" cy="3" r="1.1"/><circle cx="9" cy="3" r="1.1"/><circle cx="5" cy="7" r="1.1"/><circle cx="9" cy="7" r="1.1"/><circle cx="5" cy="11" r="1.1"/><circle cx="9" cy="11" r="1.1"/></svg>),
  Check: () => (<svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>),
  Photo: () => (<svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 9"/></svg>),
  Order: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>),
  Brand: () => (<svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>),
}

const NAV = [
  { id: 'overview',  label: '產品總覽',   icon: Icon.Dashboard },
  { id: 'process',   label: '加工流程',   icon: Icon.Flow },
  { id: 'sku',       label: 'SKU 庫存',   icon: Icon.Stack },
  { id: 'log',       label: '進出貨登記', icon: Icon.Log },
  { id: 'packaging', label: '包裝副件',     icon: Icon.Box },
  { id: 'settings',  label: '產品管理',     icon: Icon.Setting },
  { id: 'orders',    label: '訂單管理',     icon: Icon.Order },
  { id: 'brands',    label: '設計品牌管理', icon: Icon.Brand },
]

const PAGE_TITLES = {
  overview:  '產品庫存儀表板',
  process:   '加工流程看板',
  sku:       'SKU 庫存',
  log:       '進出貨登記',
  packaging: '包裝副件管理',
  settings:  '產品管理',
  orders:    '訂單管理',
  brands:    '設計品牌管理',
}

const SKU_COLORS = {
  '鈦': '#5a5550', '銀': '#c8c6c0', '橘': '#E8461A', '藍': '#1A5FAD',
  '硬膜橘': '#E8461A', '硬膜鐵灰': '#3a3f48', '硬膜銀': '#c8ccd1',
  '黑': '#1a1a1a', '白': '#f0f0f0', '玫瑰金': '#c98a73',
}

const OPERATORS = [
  { name: '阿明', role: '現場主管' },
  { name: '小芳', role: '倉務' },
  { name: '阿勗', role: '倉務' },
  { name: '小林', role: '品管' },
]
const OP_KEY = 'dicas:operator'

// ─── API helpers ─────────────────────────────────────────────
function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) },
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('未授權')
  }
  return res
}

// ─── Atoms ───────────────────────────────────────────────────
function SkuDot({ name, size = 12 }) {
  const c = SKU_COLORS[name] || '#999'
  return <span className="sku-dot" style={{ background: c, width: size, height: size }} title={name} />
}

function Badge({ state }) {
  const map = {
    wait:    { cls: 'wait',    label: '備料中' },
    process: { cls: 'process', label: '加工中' },
    back:    { cls: 'back',    label: '已回廠' },
    done:    { cls: 'done',    label: '完成' },
    pack:    { cls: 'pack',    label: '包裝中' },
  }
  const s = map[state] || map.wait
  return <span className={`badge ${s.cls}`}><span className="dot" />{s.label}</span>
}

function ActionTag({ type }) {
  const map = {
    receive: { label: '進貨',    color: 'var(--ok)',     tint: 'var(--ok-tint)' },
    send:    { label: '送出',    color: 'var(--info)',   tint: 'var(--info-tint)' },
    return:  { label: '回廠',    color: 'var(--accent)', tint: 'var(--accent-tint)' },
    ship:    { label: '大貨出貨', color: 'var(--purple)', tint: 'var(--purple-tint)' },
  }
  const a = map[type] || { label: type, color: 'var(--text-3)', tint: 'var(--bg-2)' }
  return (
    <span style={{
      fontSize: 12, padding: '2px 8px', borderRadius: 4,
      background: a.tint, color: a.color, fontWeight: 500,
    }}>{a.label}</span>
  )
}

// ─── Product image with upload (owner only) ───────────────────
function ProductImageUpload({ productId, brandColor, initials, width, height, borderRadius }) {
  const [src, setSrc] = useState(null)
  const inputRef = useRef(null)
  const KEY = `prod-img-${productId}`

  useEffect(() => {
    const stored = localStorage.getItem(KEY)
    if (stored) setSrc(stored)
  }, [KEY])

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const data = canvas.toDataURL('image/jpeg', 0.75)
        try {
          localStorage.setItem(KEY, data)
          setSrc(data)
        } catch {
          alert('圖片儲存失敗：瀏覽器儲存空間不足，請先清除其他產品圖片後再試。')
        }
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function onDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      style={{
        width, height: height || '100%', flexShrink: 0,
        borderRadius: borderRadius || '12px 0 0 12px',
        overflow: 'hidden', position: 'relative',
        background: src ? 'transparent' : (brandColor || '#E8461A'),
        cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}
    >
      {src
        ? <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', pointerEvents: 'none' }}>{initials}</span>
      }
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}

// ─── Dashboard shell ──────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const [page, setPage] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [headerActions, setHeaderActions] = useState(null)
  const headerActionsSlot = useMemo(() => ({ set: setHeaderActions }), [])

  // API state
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [partsData, setPartsData] = useState([])
  const [logs, setLogs] = useState([])
  const [packingItems, setPackingItems] = useState([])
  const [tokens, setTokens] = useState([])
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('dicas:orders')
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return []
  })
  const [showNewOrder, setShowNewOrder] = useState(false)

  function saveOrders(next) { setOrders(next); localStorage.setItem('dicas:orders', JSON.stringify(next)) }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    loadProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadParts(selectedProduct.id)
      loadLogs(selectedProduct.id)
      loadPacking(selectedProduct.id)
    }
  }, [selectedProduct])

  async function loadProducts() {
    const res = await apiFetch('/api/products')
    const data = await res.json()
    setProducts(data)
    if (data.length && !selectedProduct) setSelectedProduct(data[0])
  }
  async function loadParts(pid) {
    const res = await apiFetch(`/api/products/${pid}/parts`)
    setPartsData(await res.json())
  }
  async function loadLogs(pid) {
    const res = await apiFetch(`/api/receive-logs?product_id=${pid}&limit=200`)
    setLogs(await res.json())
  }
  async function loadPacking(pid) {
    const res = await apiFetch(`/api/packing-items?product_id=${pid}`)
    setPackingItems(await res.json())
  }
  async function loadTokens() {
    const res = await apiFetch('/api/designer-tokens')
    setTokens(await res.json())
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const title = PAGE_TITLES[page] || ''

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: collapsed ? '64px 1fr' : '240px 1fr',
      minHeight: '100vh',
      background: 'var(--bg-0)',
      fontFamily: 'var(--font-sans)',
      transition: 'grid-template-columns 0.2s ease',
    }}>
      {/* Sidebar */}
      <aside style={{
        padding: '22px 10px', display: 'flex', flexDirection: 'column', gap: 4,
        position: 'relative', borderRight: '1px solid var(--line-1)',
        background: 'var(--bg-0)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', marginBottom: 18, minHeight: 32 }}>
          <img src="/dicas-logo.svg" alt="DiCAS" style={{ height: 28, width: 'auto', display: 'block', flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontWeight: 500, fontSize: 13, letterSpacing: '0.04em', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              庫存管理系統
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            position: 'absolute', top: 28, right: -12, zIndex: 2,
            width: 24, height: 24, borderRadius: 999,
            background: 'var(--bg-1)', border: '1px solid var(--line-2)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            color: 'var(--text-2)', padding: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
            <path d="M7.5 3L4.5 6l3 3" />
          </svg>
        </button>

        {/* Nav items */}
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => { setPage(n.id); if (n.id === 'brands') loadTokens() }}
            title={collapsed ? n.label : undefined}
            style={collapsed ? { justifyContent: 'center' } : undefined}
          >
            <span className="ic"><n.icon /></span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{n.label}</span>}
          </button>
        ))}

        {/* User */}
        <div style={{
          marginTop: 'auto', borderTop: '1px solid var(--line-1)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 8px',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--bg-3)', display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0,
          }}>老</div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>老闆</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>明智工業</div>
              </div>
              <button className="btn ghost" onClick={logout} style={{ padding: '4px 8px', fontSize: 12 }}>登出</button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ background: 'var(--bg-0)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          background: 'var(--bg-1)', borderBottom: '1px solid var(--line-1)',
          padding: '14px 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', minHeight: 56, gap: 16,
        }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {page === 'overview' || page === 'process' ? (
              <>
                <button className="btn" style={{ fontSize: 13 }}>
                  <Icon.Export />匯出報表
                </button>
                {page === 'process' && headerActions}
              </>
            ) : page === 'orders' ? (
              <button className="btn primary" style={{ fontSize: 13 }} onClick={() => setShowNewOrder(true)}>
                <Icon.Plus />新增訂單
              </button>
            ) : headerActions}
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: '24px 32px 60px', flex: 1, overflow: 'auto' }}>
          {!selectedProduct && page !== 'settings' && page !== 'orders' && page !== 'brands' ? (
            <EmptyState onAdd={() => setPage('settings')} />
          ) : (
            <>
              {page === 'overview'  && <OverviewPage products={products} partsData={partsData} logs={logs} orders={orders} selectedProduct={selectedProduct} onSelectProduct={p => setSelectedProduct(p)} />}
              {page === 'process'   && <ProcessPage product={selectedProduct} headerActionsSlot={headerActionsSlot} />}
              {page === 'sku'       && <SkuPage parts={partsData} logs={logs} products={products} onSelectProduct={p => { setSelectedProduct(p); loadParts(p.id); loadLogs(p.id) }} selectedProduct={selectedProduct} />}
              {page === 'log'       && <LogPage products={products} selectedProduct={selectedProduct} logs={logs} reload={() => loadLogs(selectedProduct?.id)} />}
              {page === 'packaging' && <PackagingPage items={packingItems} product={selectedProduct} reload={() => loadPacking(selectedProduct?.id)} />}
              {page === 'settings'  && <SettingsPage products={products} reload={loadProducts} />}
              {page === 'orders'    && <OrdersPage orders={orders} saveOrders={saveOrders} products={products} showNew={showNewOrder} setShowNew={setShowNewOrder} />}
              {page === 'brands'    && <BrandsPage products={products} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Page: Overview ───────────────────────────────────────────
function OverviewPage({ products, partsData, logs, orders, selectedProduct, onSelectProduct }) {
  const stockCards = products.map(p => {
    const key = `prod-inv-${p.id}`
    const stored = (() => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } })()
    return {
      ...p,
      stock: stored.stock ?? p.finished ?? 0,
      inTransit: stored.inTransit ?? 0,
      demand: stored.demand ?? p.order_qty ?? 0,
    }
  })

  return (
    <>
      <SectionHeader title="產品庫存" count={products.length} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {stockCards.map(p => <StockCard key={p.id} p={p} orders={orders.filter(o => o.productId === p.id)} />)}
      </div>
    </>
  )
}

function SectionHeader({ title, count, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h2>
        <span className="num" style={{ color: 'var(--text-3)', fontSize: 13 }}>· {count}</span>
      </div>
      {onAction}
    </div>
  )
}

function StockCard({ p, orders }) {
  const stateMap = {
    wait: 'wait', process: 'process', back: 'back', done: 'done',
    packaging: 'pack',
  }
  const state = stateMap[p.status] || 'process'
  const skus = (p.skus || []).slice(0, 5)
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: '0.5px solid #EBEBEB', boxShadow: 'var(--shadow-1)',
      display: 'flex', overflow: 'hidden', minHeight: 132,
    }}>
      <ProductImageUpload
        productId={p.id}
        brandColor={p.brand_color || '#E8461A'}
        initials={p.initials || p.name?.slice(0, 2)}
        width={72}
      />
      <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{p.name}</div>
          </div>
          <Badge state={state} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span className="num" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>{(p.finished || 0).toLocaleString()}</span>
          <span style={{ fontSize: 12, color: '#888' }}>件</span>
        </div>
        <div style={{ fontSize: 10, color: '#888' }}>
          訂單需求 <span className="num" style={{ color: '#4A4A4A', fontWeight: 500 }}>{(p.order_qty || 0).toLocaleString()}</span> 件
          {orders.length > 0 && (
            <>
              <span style={{ margin: '0 4px', color: '#D8D6D0' }}>·</span>
              <span style={{ fontWeight: 500, color: '#4A4A4A' }}>{orders.length} 張訂單</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 6 }}>
          {skus.map(s => <SkuDot key={s.id || s.color_name} name={s.color_name || s} size={10} />)}
        </div>
      </div>
    </div>
  )
}

function pctColor(pct) {
  if (pct >= 80) return '#1A7A3C'
  if (pct >= 50) return '#B07D00'
  return '#E8461A'
}

function OrderCard({ order, product, onAllocate, onDelete }) {
  const [showAlloc, setShowAlloc] = useState(false)
  const [showDel, setShowDel] = useState(false)
  const pct = order.qty > 0 ? Math.round((order.alloc / order.qty) * 100) : 0
  const color = pctColor(pct)
  const shortId = order.id.replace(/^o-/, '').slice(0, 6).toUpperCase()
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: '0.5px solid #EBEBEB', boxShadow: 'var(--shadow-1)',
      display: 'flex', overflow: 'hidden', minHeight: 132,
    }}>
      <ProductImageUpload
        productId={product.id}
        brandColor={product.brand_color || '#E8461A'}
        initials={product.initials || product.name?.slice(0, 2)}
        width={64}
      />
      <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{product.name}</div>
          <button onClick={() => setShowDel(true)} style={{
            background: 'transparent', border: 'none', padding: 2, cursor: 'pointer',
            color: '#A8A6A0', borderRadius: 4, display: 'grid', placeItems: 'center',
          }} onMouseEnter={e => e.currentTarget.style.color = '#E8461A'} onMouseLeave={e => e.currentTarget.style.color = '#A8A6A0'}>
            <Icon.X />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span className="num" style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.025em', lineHeight: 1 }}>{pct}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color }}>%</span>
          <span className="num" style={{ marginLeft: 'auto', fontSize: 10, color: '#888' }}>{order.alloc.toLocaleString()} / {order.qty.toLocaleString()} 件</span>
        </div>
        <div style={{ height: 5, background: '#EBEBEB', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: '#F5F4F0', color: '#6B6B6B', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
            <span style={{ fontWeight: 500, color: '#4A4A4A' }}>{order.customer}</span>
            <span style={{ color: '#A8A6A0', fontFamily: 'var(--font-mono)' }}> · #{shortId}</span>
          </span>
          <span className="num" style={{ marginLeft: 'auto', fontSize: 10, color: '#888' }}>預計 {order.due}</span>
        </div>
        <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 4 }}>
          <button onClick={() => setShowAlloc(true)} style={{
            marginLeft: 'auto', background: 'transparent', border: 'none', padding: 0,
            fontSize: 10, color: '#888', cursor: 'pointer',
          }} onMouseEnter={e => e.currentTarget.style.color = '#E8461A'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>分配庫存 ›</button>
        </div>
      </div>
      {showAlloc && (
        <ModalOverlay onClose={() => setShowAlloc(false)}>
          <div style={{ width: 340, background: '#fff', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>分配庫存給訂單</div>
              <div style={{ fontSize: 12, color: '#888' }}>{product.name} · {order.customer}</div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--line-1)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>訂單總數</span>
              <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{order.qty.toLocaleString()} <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>件</span></span>
            </div>
            <AllocateInput initialValue={order.alloc} max={order.qty} onConfirm={n => { onAllocate(n); setShowAlloc(false) }} onCancel={() => setShowAlloc(false)} />
          </div>
        </ModalOverlay>
      )}
      {showDel && (
        <ModalOverlay onClose={() => setShowDel(false)}>
          <div style={{ width: 340, background: '#fff', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>移除訂單</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>確定要移除 <b>{product.name} × {order.customer}</b> 的訂單嗎？</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setShowDel(false)}>取消</button>
              <button onClick={() => { onDelete(); setShowDel(false) }} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#E8461A', color: '#fff', fontSize: 13, fontWeight: 500 }}>移除</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

function AllocateInput({ initialValue, max, onConfirm, onCancel }) {
  const [val, setVal] = useState(String(initialValue))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="field">
        <label>分配數量</label>
        <input className="input num" autoFocus type="number" value={val} onChange={e => setVal(e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn" onClick={onCancel}>取消</button>
        <button className="btn primary" onClick={() => onConfirm(Math.max(0, Math.min(max, Number(val) || 0)))}>確認</button>
      </div>
    </div>
  )
}

function NewOrderDrawer({ products, onClose, onCreate }) {
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [customer, setCustomer] = useState('')
  const [qty, setQty] = useState('')
  const [due, setDue] = useState('')
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.32)', zIndex: 99 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        background: '#fff', boxShadow: '-12px 0 40px rgba(0,0,0,0.12)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>新增訂單</div>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6 }}><Icon.X /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'auto' }}>
          <div className="field">
            <label>選擇產品</label>
            <select className="select" value={productId} onChange={e => setProductId(e.target.value)}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>客戶名稱</label>
            <input className="input" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="例：MUJI" />
          </div>
          <div className="field">
            <label>訂單數量</label>
            <input className="input num" type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>預計完成日</label>
            <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: 20, borderTop: '1px solid var(--line-1)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={() => onCreate({
            productId, customer: customer.trim() || '未命名客戶',
            qty: Number(qty) || 0,
            due: due.replace(/^\d{4}-/, '').replace('-', '/') || '—',
            alloc: 0,
          })}>建立訂單</button>
        </div>
      </div>
    </>
  )
}

// ─── Page: Process (flow board) ───────────────────────────────
const PROCESS_DATA_INIT = {
  default: {
    rows: [],
  }
}

function ProcessPage({ product, headerActionsSlot }) {
  const [partsData, setPartsData] = useState([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!product) return
    apiFetch(`/api/products/${product.id}/parts`).then(r => r.json()).then(data => {
      // Convert API parts to process rows format
      const rows = data.map(part => {
        const stations = (part.stages || []).map((st, i) => {
          const next = part.stages[i + 1]
          const isDone = st.current_stock > 0 && (next ? next.current_stock > 0 : true)
          const isCurrent = st.current_stock > 0 && (!next || next.current_stock === 0)
          return {
            vendor: st.factory_name,
            action: st.action_name,
            qty: st.current_stock > 0 ? st.current_stock : null,
            status: isDone ? 'done' : isCurrent ? 'current' : 'wait',
          }
        })
        const lastStage = part.stages?.[part.stages.length - 1]
        const finished = lastStage?.current_stock || 0
        const allDone = stations.every(s => s.status === 'done')
        return {
          name: part.name,
          skus: part.skus?.map(s => s.color_name) || [],
          state: allDone ? 'done' : stations.some(s => s.status === 'current') ? 'process' : 'wait',
          stations,
          finished,
          complete: allDone,
        }
      })
      setPartsData(rows)
    }).catch(() => setPartsData([]))
  }, [product?.id])

  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(partsData))); setEditing(true) }
  const cancelEdit = () => { setDraft(null); setEditing(false) }
  const saveEdit = () => { setPartsData(draft); setDraft(null); setEditing(false) }

  useEffect(() => {
    if (!headerActionsSlot) return
    headerActionsSlot.set(
      editing ? (
        <>
          <button className="btn" onClick={cancelEdit}>取消</button>
          <button className="btn primary" onClick={saveEdit}>儲存變更</button>
        </>
      ) : (
        <button onClick={startEdit} style={{
          appearance: 'none', font: 'inherit', fontWeight: 500, fontSize: 14,
          padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
          background: '#fff', border: '1px solid #E8461A', color: '#E8461A',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.Edit />編輯流程
        </button>
      )
    )
    return () => headerActionsSlot.set(null)
  }, [editing, headerActionsSlot])

  const rows = editing ? draft : partsData
  const imgSrc = product ? localStorage.getItem(`prod-img-${product.id}`) : null

  return (
    <>
      {editing && (
        <div style={{
          background: '#FEF6F4', border: '1px solid #FCD6CC', borderRadius: 10,
          padding: '10px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#C53A12',
        }}>
          <Icon.Edit />
          <span style={{ fontWeight: 500 }}>編輯模式</span>
          <span style={{ color: '#5F5E5A' }}>— 拖拉欄位調整加工順序，拖拉左側 grip 調整零件順序</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <p>尚無加工站資料，請前往「產品管理」新增零件與加工站</p>
        </div>
      ) : (
        <ProcessTable rows={rows} edit={editing} productImgSrc={imgSrc} onMutate={setDraft} />
      )}
    </>
  )
}

const CELL_H = 52, CELL_W = 90, NAME_W = 120, FIN_W = 80

function ProcessTable({ rows, edit, productImgSrc, onMutate }) {
  const colCount = rows.reduce((m, r) => Math.max(m, r.stations.length), 0)
  const padded = rows.map(r => {
    const sts = r.stations.slice()
    while (sts.length < colCount) sts.push(null)
    return { ...r, stations: sts }
  })

  const [colDrag, setColDrag] = useState(null)
  const [colHover, setColHover] = useState(null)
  const [rowDrag, setRowDrag] = useState(null)
  const [rowHover, setRowHover] = useState(null)
  const [delColAt, setDelColAt] = useState(null)

  const moveCol = (from, to) => {
    if (from == null || from === to) return
    const next = padded.map(r => {
      const sts = r.stations.slice()
      const [m] = sts.splice(from, 1)
      sts.splice(from < to ? to - 1 : to, 0, m)
      return { ...r, stations: sts }
    })
    onMutate(next)
  }

  const deleteCol = i => {
    onMutate(padded.map(r => ({ ...r, stations: r.stations.filter((_, ci) => ci !== i) })))
    setDelColAt(null)
  }

  const addCol = () => {
    onMutate(padded.map(r => ({ ...r, stations: [...r.stations, { vendor: '—', action: '新加工站', qty: null, status: 'wait' }] })))
  }

  const moveRow = (from, to) => {
    if (from == null || from === to) return
    const rs = padded.slice()
    const [m] = rs.splice(from, 1)
    rs.splice(from < to ? to - 1 : to, 0, m)
    onMutate(rs)
  }

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #EBEBEB', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#F8F8F6' }}>
              <th style={{ width: NAME_W, padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#888', letterSpacing: '0.04em' }}>零件</th>
              {Array.from({ length: colCount }).map((_, i) => (
                <th key={i} style={{ width: CELL_W, padding: 0, borderLeft: '0.5px solid #F0EFE8', background: '#F8F8F6' }}>
                  <div
                    draggable={edit}
                    onDragStart={edit ? () => setColDrag(i) : undefined}
                    onDragOver={edit ? e => { e.preventDefault(); setColHover(i) } : undefined}
                    onDrop={edit ? e => { e.preventDefault(); moveCol(colDrag, i); setColDrag(null); setColHover(null) } : undefined}
                    className="proc-stationhdr"
                    style={{
                      position: 'relative', height: 36, padding: '0 10px',
                      display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center',
                      fontSize: 10, fontWeight: 500, color: '#888',
                      cursor: edit ? (colDrag === i ? 'grabbing' : 'grab') : 'default',
                      opacity: colDrag === i ? 0.4 : 1,
                      outline: edit && colHover === i && colDrag != null && colDrag !== i ? '2px solid #4A8BD6' : 'none',
                      outlineOffset: -1,
                    }}
                  >
                    {edit && <Icon.Grip />}
                    <span>站 {i + 1}</span>
                    {edit && (
                      <button
                        onClick={e => { e.stopPropagation(); setDelColAt(i) }}
                        className="proc-delx"
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 16, height: 16, borderRadius: 999,
                          background: '#fff', border: '0.5px solid #EBEBEB',
                          color: '#9A9A95', cursor: 'pointer', padding: 0,
                          display: 'none', placeItems: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#C53A12'; e.currentTarget.style.borderColor = '#C53A12' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9A9A95'; e.currentTarget.style.borderColor = '#EBEBEB' }}
                      >
                        <Icon.X />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {edit && (
                <th style={{ width: 56, padding: 0, borderLeft: '0.5px solid #F0EFE8', background: '#F8F8F6' }}>
                  <div style={{ height: 36, display: 'grid', placeItems: 'center' }}>
                    <button onClick={addCol} style={{
                      appearance: 'none', font: 'inherit', cursor: 'pointer',
                      background: '#fff', border: '1px dashed #C9C7C0', color: '#888',
                      borderRadius: 6, padding: '3px 8px', fontSize: 11,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8461A'; e.currentTarget.style.color = '#E8461A' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#C9C7C0'; e.currentTarget.style.color = '#888' }}
                    >+ 新增</button>
                  </div>
                </th>
              )}
              <th style={{ width: FIN_W, padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 500, color: '#888', borderLeft: '0.5px solid #EBEBEB', background: '#F8F8F6' }}>成品</th>
            </tr>
          </thead>
          <tbody>
            {padded.map((row, ri) => {
              const isDragging = rowDrag === ri
              const isHover = edit && rowHover === ri && rowDrag != null && rowDrag !== ri
              return (
                <tr
                  key={row.name + ri}
                  onDragOver={edit ? e => { e.preventDefault(); setRowHover(ri) } : undefined}
                  onDrop={edit ? e => { e.preventDefault(); moveRow(rowDrag, ri); setRowDrag(null); setRowHover(null) } : undefined}
                  style={{ borderTop: '0.5px solid #F0EFE8', background: isHover ? '#EEF4FA' : 'transparent', opacity: isDragging ? 0.4 : 1 }}
                >
                  <td style={{ width: NAME_W, padding: '0 14px', verticalAlign: 'middle' }}>
                    <div style={{ height: CELL_H, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {edit && (
                        <span
                          draggable
                          onDragStart={e => { setRowDrag(ri) }}
                          onDragEnd={() => { setRowDrag(null); setRowHover(null) }}
                          style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'inline-flex' }}
                        ><Icon.Grip /></span>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                          {row.skus.slice(0, 4).map(s => <SkuDot key={s} name={s} size={7} />)}
                          {row.skus.length > 4 && <span style={{ fontSize: 10, color: '#888' }}>+{row.skus.length - 4}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  {row.stations.map((st, ci) => <StationCell key={ci} st={st} />)}
                  {edit && <td style={{ width: 56, borderLeft: '0.5px solid #F0EFE8' }}><div style={{ height: CELL_H }} /></td>}
                  <td style={{ width: FIN_W, padding: 0, verticalAlign: 'middle', borderLeft: '0.5px solid #EBEBEB', background: '#FAF9F5' }}>
                    <div style={{ height: CELL_H, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{
                        height: 22, borderRadius: 4, overflow: 'hidden',
                        background: row.complete ? '#E6F4EC' : '#F0EFE8',
                        display: 'grid', placeItems: 'center',
                        color: row.complete ? '#1A7A3C' : '#A8A6A0',
                      }}>
                        {row.complete
                          ? <Icon.Check />
                          : productImgSrc
                            ? <img src={productImgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Icon.Photo />
                        }
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                        <span className="num" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{(row.finished || 0).toLocaleString()}</span>
                        <span style={{ fontSize: 10, color: '#888' }}>件</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {delColAt != null && (
        <ModalOverlay onClose={() => setDelColAt(null)}>
          <div style={{ width: 340, background: '#fff', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>刪除加工站</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>刪除 <b>站 {delColAt + 1}</b> 將清除該站所有紀錄，確認？</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setDelColAt(null)}>取消</button>
              <button onClick={() => deleteCol(delColAt)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#E8461A', color: '#fff', fontSize: 13, fontWeight: 500 }}>刪除</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  )
}

function StationCell({ st }) {
  if (!st) return (
    <td style={{ width: CELL_W, padding: 0, verticalAlign: 'middle', borderLeft: '0.5px solid #F0EFE8' }}>
      <div style={{ height: CELL_H }} />
    </td>
  )
  const isDone = st.status === 'done'
  const isCurrent = st.status === 'current'
  const isWait = st.status === 'wait'
  const bg = isDone ? '#F0FBF4' : isCurrent ? '#FEF6F4' : '#FFFFFF'
  const statusColor = isDone ? '#1A7A3C' : isCurrent ? '#E8461A' : '#888'
  const qtyColor = isCurrent ? '#E8461A' : '#1A1A1A'
  return (
    <td style={{ width: CELL_W, padding: 0, verticalAlign: 'middle', borderLeft: '0.5px solid #F0EFE8' }}>
      <div style={{ height: CELL_H, padding: '6px 8px', background: bg, opacity: isWait ? 0.35 : 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
        <div style={{ fontSize: 9, fontWeight: 500, color: statusColor, display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1 }}>
          {isDone && <span style={{ fontSize: 10 }}>✓</span>}
          {isCurrent && <span style={{ width: 5, height: 5, borderRadius: 999, background: statusColor, display: 'inline-block' }} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.action}</span>
        </div>
        <div className="num" style={{ fontSize: 13, fontWeight: 600, color: qtyColor, letterSpacing: '-0.01em' }}>
          {st.qty == null ? '—' : st.qty.toLocaleString()}
        </div>
      </div>
    </td>
  )
}

// ─── Page: SKU Inventory ──────────────────────────────────────
function SkuPage({ parts, logs, products, onSelectProduct, selectedProduct }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Product tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--line-1)', width: 'fit-content', marginBottom: 8 }}>
        {products.map(p => (
          <button key={p.id} className="btn ghost" onClick={() => onSelectProduct(p)} style={{
            padding: '8px 16px', fontSize: 13,
            background: selectedProduct?.id === p.id ? 'var(--bg-3)' : 'transparent',
            color: selectedProduct?.id === p.id ? 'var(--text-1)' : 'var(--text-3)',
            fontWeight: selectedProduct?.id === p.id ? 500 : 400,
          }}>{p.name}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {parts.map((part, i) => <SkuPartRow key={part.id} part={part} logs={logs} isFirst={i === 0} />)}
        {parts.length === 0 && <div style={{ padding: '40px 24px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>尚無零件資料</div>}
      </div>
    </div>
  )
}

function SkuPartRow({ part, logs, isFirst }) {
  const [open, setOpen] = useState(isFirst)
  const skuLogs = (color_name) => logs.filter(l => l.part_id === part.id && l.sku_color === color_name)
  return (
    <div style={{ borderTop: isFirst ? 'none' : '1px solid var(--line-1)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', border: 'none', background: 'transparent', textAlign: 'left',
        padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
      }}>
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--text-3)', display: 'inline-flex' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
        </span>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{part.name}</span>
        <div style={{ display: 'flex', gap: 4 }}>{part.skus?.map(s => <SkuDot key={s.id} name={s.color_name} />)}</div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{part.skus?.length || 0} 個 SKU</span>
      </button>
      {open && part.skus?.length > 0 && (
        <div style={{ padding: '0 24px 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line-1)' }}>
                {['SKU', '進貨', '送加工', '回廠', '出貨', '不良', '估計在庫'].map(h => (
                  <th key={h} style={{ padding: '8px 0', textAlign: h === 'SKU' ? 'left' : 'right', fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {part.skus.map(sku => {
                const sl = skuLogs(sku.color_name)
                const receive = sl.filter(l => l.action_type === 'receive').reduce((s, l) => s + l.qty, 0)
                const send = sl.filter(l => l.action_type === 'send').reduce((s, l) => s + l.qty, 0)
                const ret = sl.filter(l => l.action_type === 'return').reduce((s, l) => s + l.qty, 0)
                const ship = sl.filter(l => l.action_type === 'ship').reduce((s, l) => s + l.qty, 0)
                const defect = sl.reduce((s, l) => s + (l.defect_qty || 0), 0)
                const est = receive + ret - send - ship
                const low = est <= 50
                return (
                  <tr key={sku.id} style={{ borderBottom: '1px solid var(--line-1)' }}>
                    <td style={{ padding: '10px 0' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <SkuDot name={sku.color_name} />{sku.color_name}
                      </span>
                    </td>
                    {[receive, send, ret, ship, defect].map((v, i) => (
                      <td key={i} className="num" style={{ padding: '10px 0', textAlign: 'right', color: [null, 'var(--accent)', 'var(--ok)', 'var(--info)', 'var(--bad)'][i] || 'inherit' }}>{v || '—'}</td>
                    ))}
                    <td className="num" style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: low ? 'var(--bad)' : 'var(--text-1)' }}>
                      {low && <span style={{ color: 'var(--bad)', marginRight: 4 }}>●</span>}{est}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page: Log entry ──────────────────────────────────────────
function LogPage({ products, selectedProduct, logs, reload }) {
  const [action, setAction] = useState('receive')
  const [pid, setPid] = useState(selectedProduct?.id || '')
  const [partName, setPartName] = useState('')
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')
  const [defect, setDefect] = useState('')
  const [note, setNote] = useState('')
  const [hover, setHover] = useState(null)
  const [operator, setOperator] = useState(() => { try { return localStorage.getItem(OP_KEY) } catch { return null } })
  const [switching, setSwitching] = useState(false)
  const [partsData, setPartsData] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const showPicker = !operator || switching

  useEffect(() => {
    if (pid) apiFetch(`/api/products/${pid}/parts`).then(r => r.json()).then(d => { setPartsData(d); setPartName(d[0]?.name || ''); setSku(d[0]?.skus?.[0]?.color_name || '') })
  }, [pid])

  useEffect(() => {
    if (selectedProduct) setPid(selectedProduct.id)
  }, [selectedProduct?.id])

  const product = products.find(p => p.id === pid)
  const part = partsData.find(p => p.name === partName)

  const ACTIONS = [
    { key: 'receive', label: '進貨',    color: 'var(--ok)',     tint: 'var(--ok-tint)',     hint: '原料或半成品從加工廠送回我們倉庫' },
    { key: 'send',    label: '送出',    color: 'var(--info)',   tint: 'var(--info-tint)',   hint: '把零件送去外部加工廠處理' },
    { key: 'return',  label: '回廠',    color: 'var(--accent)', tint: 'var(--accent-tint)', hint: '外部加工完成的零件回到倉庫，會記錄不良品' },
    { key: 'ship',    label: '大貨出貨', color: 'var(--purple)', tint: 'var(--purple-tint)', hint: '成品出貨給品牌客戶或通路' },
  ]
  const shown = ACTIONS.find(a => a.key === (hover || action))

  async function submit() {
    if (!qty || isNaN(+qty)) return alert('請輸入正確數量')
    setSubmitting(true)
    try {
      await apiFetch('/api/receive-logs', {
        method: 'POST',
        body: JSON.stringify({
          product_id: pid, part_id: part?.id,
          sku_color: sku || '', action_type: action,
          qty: +qty, defect_qty: defect ? +defect : 0, note,
          operator,
        })
      })
      setQty(''); setDefect(''); setNote('')
      reload()
    } catch (e) { alert('送出失敗：' + e.message) }
    finally { setSubmitting(false) }
  }

  function pickOp(name) {
    setOperator(name)
    try { localStorage.setItem(OP_KEY, name) } catch {}
    setSwitching(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16, alignItems: 'start' }}>
      {/* Form */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>新增登記</h3>
          {operator && (
            <button onClick={() => setSwitching(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
              background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 999,
              cursor: 'pointer', font: 'inherit',
            }}>
              <span style={{ width: 20, height: 20, borderRadius: 999, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>{operator.slice(0, 1)}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{operator}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>切換</span>
            </button>
          )}
        </div>

        {showPicker && <OperatorPicker onPick={pickOp} dismissable={!!operator} onDismiss={() => setSwitching(false)} />}

        <div className="field">
          <label>動作類型</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ACTIONS.map(a => (
              <button key={a.key}
                onClick={() => setAction(a.key)}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
                style={{
                  padding: '12px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  border: `1px solid ${action === a.key ? a.color : 'var(--line-2)'}`,
                  background: action === a.key ? a.tint : 'var(--bg-1)',
                  color: action === a.key ? a.color : 'var(--text-2)',
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: a.color }} />{a.label}
              </button>
            ))}
          </div>
          {shown && (
            <div style={{ marginTop: 6, padding: '8px 12px', borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--line-1)', fontSize: 12, color: 'var(--text-2)' }}>
              <b style={{ color: 'var(--text-1)' }}>{shown.label}</b> · {shown.hint}
            </div>
          )}
        </div>

        <div className="field">
          <label>產品</label>
          <select className="select" value={pid} onChange={e => setPid(e.target.value)}>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>零件</label>
          <select className="select" value={partName} onChange={e => { setPartName(e.target.value); const np = partsData.find(x => x.name === e.target.value); setSku(np?.skus?.[0]?.color_name || '') }}>
            {partsData.map(p => <option key={p.id}>{p.name}</option>)}
          </select>
        </div>

        {part?.skus?.length > 0 && (
          <div className="field">
            <label>SKU 顏色</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {part.skus.map(s => (
                <button key={s.id} onClick={() => setSku(s.color_name)} style={{
                  padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                  border: `1px solid ${sku === s.color_name ? 'var(--accent)' : 'var(--line-2)'}`,
                  background: sku === s.color_name ? 'var(--accent-tint)' : 'var(--bg-1)',
                  color: sku === s.color_name ? 'var(--accent)' : 'var(--text-2)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <SkuDot name={s.color_name} />{s.color_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>數量</label>
            <input className="input num" type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>不良品數量</label>
            <input className="input num" type="number" value={defect} onChange={e => setDefect(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="field">
          <label>備註</label>
          <input className="input" placeholder="（選填）" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <button className="btn primary" onClick={submit} disabled={submitting} style={{ width: '100%', padding: 14, justifyContent: 'center', fontSize: 15 }}>
          {submitting ? '送出中...' : '確認送出'}
        </button>
      </div>

      {/* Recent logs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>最近紀錄</h3>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{logs.length} 筆</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)' }}>
                {['時間', '登記人', '動作', '零件', 'SKU', '數量', '不良'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 400, color: 'var(--text-3)', borderBottom: '1px solid var(--line-1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={7} style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>尚無紀錄</td></tr>}
              {logs.slice(0, 50).map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--line-1)' }}>
                  <td className="num" style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{log.logged_at?.slice(0, 16).replace('T', ' ')}</td>
                  <td style={{ padding: '12px 14px' }}>{log.operator || log.who || '—'}</td>
                  <td style={{ padding: '12px 14px' }}><ActionTag type={log.action_type} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{log.part_name || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {log.sku_color && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><SkuDot name={log.sku_color} />{log.sku_color}</span>}
                  </td>
                  <td className="num" style={{ padding: '12px 14px', fontWeight: 500 }}>{log.qty}</td>
                  <td className="num" style={{ padding: '12px 14px', color: 'var(--bad)' }}>{log.defect_qty || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Operator picker modal ────────────────────────────────────
function OperatorPicker({ onPick, dismissable, onDismiss }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,20,20,0.45)', display: 'grid', placeItems: 'center', zIndex: 200, borderRadius: 16, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>你是誰？</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>選擇今天的登記人</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {OPERATORS.map(op => (
            <button key={op.name} onClick={() => onPick(op.name)}
              style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 12, padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, font: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-1)'; e.currentTarget.style.background = 'var(--bg-1)' }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700 }}>{op.name.slice(0, 1)}</span>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{op.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{op.role}</div>
            </button>
          ))}
        </div>
        {dismissable && <button onClick={onDismiss} style={{ background: 'transparent', border: 'none', padding: 4, fontSize: 12, color: 'var(--text-3)', cursor: 'pointer' }}>取消</button>}
      </div>
    </div>
  )
}

// ─── Page: Packaging ─────────────────────────────────────────
function PackagingPage({ items, product, reload }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', supplier: '', stock: 0 })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})

  async function addItem() {
    await apiFetch('/api/packing-items', { method: 'POST', body: JSON.stringify({ product_id: product.id, ...form }) })
    setForm({ name: '', supplier: '', stock: 0 }); setShowAdd(false); reload()
  }
  async function updateItem(id) {
    await apiFetch(`/api/packing-items/${id}`, { method: 'PUT', body: JSON.stringify(editData) })
    setEditId(null); reload()
  }
  async function deleteItem(id) {
    if (!confirm('確認刪除？')) return
    await apiFetch(`/api/packing-items/${id}`, { method: 'DELETE' }); reload()
  }

  const PACKING_MOCK = [
    { name: '彩盒 · ' + (product?.name || ''), stock: 1800, min: 500, used: 320, vendor: '盒立精緻' },
    { name: '說明書 · ' + (product?.name || ''), stock: 120, min: 500, used: 200, vendor: '印良印刷' },
    { name: '防塵袋 · 通用', stock: 8400, min: 1000, used: 600, vendor: '毛胚布業' },
  ]

  const displayItems = items.length > 0 ? items : PACKING_MOCK

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>包裝副件</h3>
        <button className="btn primary" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 13 }}><Icon.Plus />新增副件</button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-tint-hi)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="副件名稱" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input" style={{ width: 120 }} placeholder="供應商" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
          <input type="number" className="input num" style={{ width: 100 }} placeholder="庫存" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} />
          <button className="btn primary" onClick={addItem}>新增</button>
          <button className="btn" onClick={() => setShowAdd(false)}>取消</button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)' }}>
              {['品項', '供應商', '庫存', '本月用量', '最低安全量', '狀態', '操作'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 400, color: 'var(--text-3)', borderBottom: '1px solid var(--line-1)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item, i) => {
              const low = item.stock < (item.min || 0)
              return (
                <tr key={item.id || i} style={{ borderBottom: '1px solid var(--line-1)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)' }}>{item.supplier || item.vendor || '—'}</td>
                  <td className="num" style={{ padding: '14px 16px', fontSize: 16, fontWeight: 500, color: low ? 'var(--bad)' : 'var(--text-1)' }}>{(item.stock || 0).toLocaleString()}</td>
                  <td className="num" style={{ padding: '14px 16px', color: 'var(--text-3)' }}>{(item.month_out || item.used || 0).toLocaleString()}</td>
                  <td className="num" style={{ padding: '14px 16px', color: 'var(--text-4)' }}>{(item.min || 0).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {low
                      ? <span className="badge low"><Icon.Warn />低庫存</span>
                      : <span className="badge done"><span className="dot" />正常</span>
                    }
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {item.id && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditId(item.id); setEditData({ ...item }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--info)', fontSize: 12 }}>編輯</button>
                        <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bad)', fontSize: 12 }}>刪除</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page: Settings ───────────────────────────────────────────
function SettingsPage({ products, reload }) {
  const [newProduct, setNewProduct] = useState({ name: '', description: '', order_qty: '', order_date: '' })
  const [newPart, setNewPart] = useState({ product_id: '', name: '' })

  async function createProduct() {
    if (!newProduct.name) return alert('請填寫產品名稱')
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(newProduct) })
    setNewProduct({ name: '', description: '', order_qty: '', order_date: '' }); reload()
  }
  async function createPart() {
    if (!newPart.product_id || !newPart.name) return alert('請選擇產品並填寫零件名稱')
    await apiFetch('/api/parts', { method: 'POST', body: JSON.stringify(newPart) })
    setNewPart(p => ({ ...p, name: '' })); reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      {/* Product images */}
      <SettingsSection title="產品圖片">
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>拖曳或點擊圖片區域上傳產品照，設計師端會以唯讀方式看到。</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: 16, display: 'flex', gap: 16 }}>
              <ProductImageUpload
                productId={p.id}
                brandColor={p.brand_color || '#E8461A'}
                initials={p.initials || p.name?.slice(0, 2)}
                width={100}
                height={100}
                borderRadius={10}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{p.description}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', marginTop: 10, alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-3)' }}>訂單量</span>
                  <span className="num" style={{ fontWeight: 500 }}>{p.order_qty?.toLocaleString() || '—'}</span>
                  {p.estimated_completion && (
                    <>
                      <span style={{ color: 'var(--text-3)' }}>預計完成</span>
                      <span className="num" style={{ color: 'var(--accent)', fontWeight: 500 }}>{p.estimated_completion}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Add product */}
      <SettingsSection title="新增產品">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div className="field"><label>產品名稱 *</label><input className="input" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="field"><label>描述</label><input className="input" value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="field"><label>訂單數量</label><input type="number" className="input num" value={newProduct.order_qty} onChange={e => setNewProduct(p => ({ ...p, order_qty: e.target.value }))} /></div>
          <div className="field"><label>訂單日期</label><input type="date" className="input" value={newProduct.order_date} onChange={e => setNewProduct(p => ({ ...p, order_date: e.target.value }))} /></div>
        </div>
        <button className="btn primary" onClick={createProduct} style={{ marginTop: 12 }}><Icon.Plus />新增產品</button>
      </SettingsSection>

      {/* Add part */}
      <SettingsSection title="新增零件">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="select" style={{ flex: '0 0 160px' }} value={newPart.product_id} onChange={e => setNewPart(p => ({ ...p, product_id: e.target.value }))}>
            <option value="">選擇產品</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="零件名稱" value={newPart.name} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} />
          <button className="btn primary" onClick={createPart}><Icon.Plus />新增零件</button>
        </div>
      </SettingsSection>
    </div>
  )
}

// ─── Page: Orders ─────────────────────────────────────────────
function OrdersPage({ orders, saveOrders, products, showNew, setShowNew }) {
  return (
    <>
      <SectionHeader title="進行中訂單" count={orders.length} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {orders.map(o => {
          const product = products.find(p => p.id === o.productId)
          if (!product) return null
          return (
            <OrderCard
              key={o.id} order={o} product={product}
              onAllocate={n => saveOrders(orders.map(x => x.id === o.id ? { ...x, alloc: n } : x))}
              onDelete={() => saveOrders(orders.filter(x => x.id !== o.id))}
            />
          )
        })}
        {orders.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, gridColumn: '1/-1' }}>尚無訂單</p>}
      </div>
      {showNew && (
        <NewOrderDrawer
          products={products}
          onClose={() => setShowNew(false)}
          onCreate={payload => { saveOrders([...orders, { id: `o-${Date.now()}`, ...payload }]); setShowNew(false) }}
        />
      )}
    </>
  )
}

// ─── Page: Brands ─────────────────────────────────────────────
function BrandsPage({ products }) {
  const [brands, setBrands] = useState([])
  const [newName, setNewName] = useState('')
  const [assignSelects, setAssignSelects] = useState({}) // brandId → selected product_id

  useEffect(() => { loadBrands() }, [])

  async function loadBrands() {
    const res = await apiFetch('/api/brands')
    setBrands(await res.json())
  }
  async function createBrand() {
    if (!newName.trim()) return alert('請填寫品牌名稱')
    await apiFetch('/api/brands', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) })
    setNewName(''); loadBrands()
  }
  async function deleteBrand(id) {
    if (!confirm('確認刪除此品牌？')) return
    await apiFetch(`/api/brands/${id}`, { method: 'DELETE' }); loadBrands()
  }
  async function assignProduct(brandId) {
    const productId = assignSelects[brandId]
    if (!productId) return
    await apiFetch(`/api/brands/${brandId}/products`, { method: 'POST', body: JSON.stringify({ product_id: productId }) })
    setAssignSelects(s => ({ ...s, [brandId]: '' })); loadBrands()
  }
  async function removeProduct(brandId, productId) {
    await apiFetch(`/api/brands/${brandId}/products/${productId}`, { method: 'DELETE' }); loadBrands()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      {/* Create brand */}
      <SettingsSection title="新增品牌">
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input" style={{ flex: 1 }} placeholder="品牌名稱（如：Cumei）" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createBrand()} />
          <button className="btn primary" onClick={createBrand}><Icon.Plus />新增</button>
        </div>
      </SettingsSection>

      {/* Brand list */}
      {brands.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-3)' }}>尚無品牌，請先新增。</p>}
      {brands.map(brand => {
        const link = `${window.location.origin}/brand/${brand.token}`
        const assignedIds = new Set(brand.products.map(p => p.id))
        const unassigned = products.filter(p => !assignedIds.has(p.id))
        return (
          <div key={brand.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Brand header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{brand.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => { navigator.clipboard.writeText(link); alert('連結已複製！') }}
                  style={{ background: 'none', border: '1px solid var(--line-2)', borderRadius: 6, cursor: 'pointer', color: 'var(--info)', fontSize: 12, padding: '4px 10px' }}>
                  複製連結
                </button>
                <button onClick={() => deleteBrand(brand.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bad)', fontSize: 12 }}>
                  刪除品牌
                </button>
              </div>
            </div>

            {/* Assigned products */}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                已指派產品 ({brand.products.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {brand.products.map(p => (
                  <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: 20, padding: '4px 10px 4px 12px', fontSize: 13 }}>
                    {p.name}
                    <button onClick={() => removeProduct(brand.id, p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)', display: 'grid', placeItems: 'center', lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--bad)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                      <Icon.X />
                    </button>
                  </span>
                ))}
                {brand.products.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-4)' }}>尚未指派任何產品</span>}
              </div>
            </div>

            {/* Assign product */}
            {unassigned.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="select" style={{ flex: 1 }}
                  value={assignSelects[brand.id] || ''}
                  onChange={e => setAssignSelects(s => ({ ...s, [brand.id]: e.target.value }))}>
                  <option value="">選擇要指派的產品…</option>
                  {unassigned.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="btn primary" onClick={() => assignProduct(brand.id)}><Icon.Plus />指派</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SettingsSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>{title}</div>
      <div className="card" style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
function ModalOverlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.32)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-1)', margin: '0 0 8px' }}>尚無產品資料</p>
      <p style={{ fontSize: 13, margin: '0 0 20px' }}>請執行 <code style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>npm run seed</code> 或前往產品管理新增產品</p>
      <button className="btn primary" onClick={onAdd}><Icon.Setting />前往產品管理</button>
    </div>
  )
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACTION_LABEL, resolveActionType, resolveStageId } from './Input.jsx'

// ─── Icons ───────────────────────────────────────────────────
const S = { viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"1.6", strokeLinecap:"round", strokeLinejoin:"round" }
const Icon = {
  // ti-layout-dashboard
  Dashboard: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"/><path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"/><path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"/><path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"/></svg>),
  // ti-arrow-guide
  Flow: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 7l0 5a5 5 0 0 0 5 5l2 0"/><path d="M18 14l3 3l-3 3"/></svg>),
  // ti-components
  Stack: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12l3 3l3 -3l-3 -3z"/><path d="M15 12l3 3l3 -3l-3 -3z"/><path d="M9 6l3 3l3 -3l-3 -3z"/><path d="M9 18l3 3l3 -3l-3 -3z"/></svg>),
  // ti-package
  Log: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5"/><path d="M12 12l8 -4.5"/><path d="M12 12l0 9"/><path d="M12 12l-8 -4.5"/><path d="M16 5.25l-8 4.5"/></svg>),
  // generic box (used in OverviewPage section header)
  Box: () => (<svg {...S} width="18" height="18"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>),
  // ti-cube
  Setting: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.717z"/><path d="M12 12l9 -5.25"/><path d="M12 12l0 9.5"/><path d="M12 12l-9 -5.25"/></svg>),
  Plus: () => (<svg viewBox="0 0 14 14" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>),
  Export: () => (<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 11V2M5 5l3-3 3 3M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/></svg>),
  Trash: () => (<svg viewBox="0 0 16 16" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5L13 4"/></svg>),
  Warn: () => (<svg viewBox="0 0 14 14" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5l6 11H1l6-11z"/><path d="M7 6v3M7 11h.01"/></svg>),
  Edit: () => (<svg viewBox="0 0 16 16" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8L3 13l.5-2.5 8-8z"/></svg>),
  ChevronLeft: () => (<svg viewBox="0 0 12 12" fill="none" width="12" height="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 3L4.5 6l3 3"/></svg>),
  X: () => (<svg viewBox="0 0 14 14" fill="none" width="10" height="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>),
  Grip: () => (<svg width="10" height="14" viewBox="0 0 14 14" fill="#B0ADA6"><circle cx="5" cy="3" r="1.1"/><circle cx="9" cy="3" r="1.1"/><circle cx="5" cy="7" r="1.1"/><circle cx="9" cy="7" r="1.1"/><circle cx="5" cy="11" r="1.1"/><circle cx="9" cy="11" r="1.1"/></svg>),
  Check: () => (<svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>),
  AlertTriangle: ({ size = 16, color = 'currentColor' } = {}) => (<svg viewBox="0 0 24 24" fill="none" width={size} height={size} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  ChevronDown: ({ size = 14, color = 'currentColor' } = {}) => (<svg viewBox="0 0 24 24" fill="none" width={size} height={size} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>),
  ChevronUp: ({ size = 14, color = 'currentColor' } = {}) => (<svg viewBox="0 0 24 24" fill="none" width={size} height={size} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>),
  Photo: () => (<svg {...S} width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 9"/></svg>),
  // ti-clipboard-list
  Order: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h.01"/><path d="M13 12h2"/><path d="M9 16h.01"/><path d="M13 16h2"/></svg>),
  // ti-palette
  Brand: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25"/><path d="M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>),
  // ti-settings (gear)
  Gear: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/></svg>),
  // ti-logout
  Logout: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2"/><path d="M9 12h12l-3 -3"/><path d="M18 15l3 -3"/></svg>),
  // ti-building-factory
  Factory: () => (<svg {...S} width="16" height="16"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l18 0"/><path d="M5 21v-10l4 -2v3l4 -2v3l4 -2v10"/><path d="M5 14l1 0"/><path d="M9 14l1 0"/><path d="M13 14l1 0"/><path d="M17 21l0 -4"/></svg>),
}

const NAV = [
  { id: 'overview',  label: '生產看板',     icon: Icon.Dashboard },
  { id: 'process',   label: '加工流程',     icon: Icon.Flow },
  { id: 'log',       label: '進出貨登記',   icon: Icon.Log },
  null,
  { id: 'orders',    label: '訂單管理',     icon: Icon.Order },
  null,
  { id: 'settings',  label: '產品管理',     icon: Icon.Setting },
  { id: 'factories', label: '加工廠商',     icon: Icon.Factory },
  { id: 'brands',    label: '設計品牌管理', icon: Icon.Brand },
]

const PAGE_TITLES = {
  overview:  '生產看板',
  process:   '加工流程看板',
  sku:       '零件管理',
  log:       '進出貨登記',
  settings:  '產品管理',
  orders:    '訂單管理',
  factories: '加工廠商',
  brands:    '設計品牌管理',
}

const SKU_COLORS = {
  '鈦': '#5a5550', '銀': '#c8c6c0', '橘': '#E8461A', '藍': '#1A5FAD',
  '硬膜橘': '#E8461A', '硬膜鐵灰': '#3a3f48', '硬膜銀': '#c8ccd1',
  '黑': '#1a1a1a', '白': '#f0f0f0', '玫瑰金': '#c98a73',
}


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
function SkuDot({ name, hex, size = 12 }) {
  const c = SKU_COLORS[name] || hex || '#999'
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
    receive: { label: '進貨',  color: 'var(--ok)',     tint: 'var(--ok-tint)' },
    return:  { label: '回廠',  color: 'var(--info)',   tint: 'var(--info-tint)' },
    send:    { label: '送出',  color: 'var(--accent)', tint: 'var(--accent-tint)' },
    ship:    { label: '大貨',  color: 'var(--purple)', tint: 'var(--purple-tint)' },
    rework:  { label: '重工',  color: '#6B3FA0',       tint: '#EFE7F8' },
    scrap:   { label: '報廢',  color: 'var(--bad)',    tint: 'var(--bad-tint)' },
    qc:      { label: '品檢',  color: '#185FA5',       tint: '#E6F0FB' },
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

function UserIconBtn({ onClick, title, hoverColor = '#1A1A1A', children }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none', padding: 0,
        background: hov ? '#EBEBEB' : 'transparent',
        color: hov ? hoverColor : '#888',
        cursor: 'pointer', display: 'grid', placeItems: 'center',
        flexShrink: 0, transition: 'background .12s, color .12s',
      }}>
      {children}
    </button>
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
  const [tokens, setTokens] = useState([])
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('dicas:orders')
    if (saved) { try { return JSON.parse(saved) } catch {} }
    return []
  })
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [ordersFilter, setOrdersFilter] = useState(null)
  const [processReloadKey, setProcessReloadKey] = useState(0)

  function saveOrders(next) { setOrders(next); localStorage.setItem('dicas:orders', JSON.stringify(next)) }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    loadProducts()
    loadLogs()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadParts(selectedProduct.id)
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
  // 不再依 product_id 篩選——「最近紀錄」要顯示所有產品的紀錄
  async function loadLogs() {
    const res = await apiFetch('/api/receive-logs?limit=200')
    setLogs(await res.json())
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

  useEffect(() => {
    document.title = title ? `${title} — Inventory OS` : 'Inventory OS'
  }, [title])

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
        {NAV.map((n, i) => n === null
          ? <div key={`div-${i}`} style={{ height: '0.5px', background: '#EBEBEB', margin: '6px 4px' }} />
          : (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => { setPage(n.id); if (n.id === 'brands') loadTokens(); if (n.id === 'process') setProcessReloadKey(k => k + 1) }}
              title={collapsed ? n.label : undefined}
              style={collapsed ? { justifyContent: 'center', marginBottom: 2 } : undefined}
            >
              <span className="ic"><n.icon /></span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{n.label}</span>}
            </button>
          )
        )}

        {/* User block */}
        <div style={{
          marginTop: 'auto', borderTop: '1px solid var(--line-1)',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden' }}>益成金屬</div>
              <div style={{ fontSize: 11, color: '#888' }}>管理後台</div>
            </div>
          )}
          <UserIconBtn onClick={() => setPage('settings')} title="產品管理">
            <Icon.Gear />
          </UserIconBtn>
          <UserIconBtn onClick={logout} title="登出" hoverColor="#E8461A">
            <Icon.Logout />
          </UserIconBtn>
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
          {!selectedProduct && page !== 'settings' && page !== 'orders' && page !== 'brands' && page !== 'factories' ? (
            <EmptyState onAdd={() => setPage('settings')} />
          ) : (
            <>
              {page === 'overview'  && <OverviewPage products={products} logs={logs} orders={orders}
                onGoToProcess={p => { if (p) { setSelectedProduct(p); loadParts(p.id) } setPage('process') }}
                onGoToParts={p => { if (p) setSelectedProduct(p); setPage('process') }}
                onGoToLog={() => setPage('log')}
                onGoToBrands={() => { loadTokens(); setPage('brands') }}
                onGoToOrders={pid => { setOrdersFilter(pid); setPage('orders') }}
              />}
              {page === 'process'   && <ProcessPage products={products} selectedProduct={selectedProduct} onSelectProduct={p => setSelectedProduct(p)} headerActionsSlot={headerActionsSlot} reloadKey={processReloadKey} />}
              {page === 'log'       && <LogPage products={products} selectedProduct={selectedProduct} logs={logs} reload={loadLogs} onLogSubmit={() => setProcessReloadKey(k => k + 1)} />}
              {page === 'settings'  && <SettingsPage products={products} orders={orders} reload={loadProducts}
                onGoToProcess={p => { setSelectedProduct(p); setPage('process') }}
                onGoToOrders={pid => { setOrdersFilter(pid); setPage('orders') }}
              />}
              {page === 'orders'    && <OrdersPage orders={orders} saveOrders={saveOrders} products={products} showNew={showNewOrder} setShowNew={setShowNewOrder} filterProductId={ordersFilter} setFilterProductId={setOrdersFilter} />}
              {page === 'factories' && <FactoriesPage />}
              {page === 'brands'    && <BrandsPage products={products} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Page: Overview ───────────────────────────────────────────
// ─── Overview sub-components ──────────────────────────────────
function OvSectionHead({ icon: IconComp, title, count, linkLabel, onLink, link2Label, onLink2 }) {
  const linkBtn = (label, handler) => (
    <button onClick={handler} style={{
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-3)',
      padding: 0, fontFamily: 'inherit',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = '#E8461A'; e.currentTarget.style.textDecoration = 'underline' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.textDecoration = 'none' }}>
      {label} →
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: '#FEE9E4', display: 'grid', placeItems: 'center', color: '#E8461A', flexShrink: 0 }}>
          <IconComp />
        </div>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {link2Label && onLink2 && linkBtn(link2Label, onLink2)}
        {linkLabel && onLink && linkBtn(linkLabel, onLink)}
      </div>
    </div>
  )
}

function ProductOverviewCard({ product, orders, onGoToProcess, onGoToOrders }) {
  const [imgSrc, setImgSrc] = useState(null)
  useEffect(() => {
    const stored = localStorage.getItem(`prod-img-${product.id}`)
    if (stored) setImgSrc(stored)
  }, [product.id])

  const orderCount = orders.length
  const warehouseTotal = product.warehouse_total || 0
  const inTransitTotal = product.in_transit_total || 0

  const totalQty = orders.reduce((s, o) => s + (o.qty || 0), 0)
  const totalAlloc = orders.reduce((s, o) => s + (o.alloc || 0), 0)
  const pct = totalQty > 0 ? Math.round((totalAlloc / totalQty) * 100) : 0

  const statusBadge =
    pct >= 100        ? { label: '完成',    bg: '#E6F4EC', color: '#1A7A3C' }
    : pct >= 80       ? { label: '包裝中',  bg: '#FEF3CD', color: '#B07D00' }
    : inTransitTotal > 0 ? { label: '加工中', bg: '#FEE9E4', color: '#E8461A' }
    : { label: '送加工廠', bg: '#E6F0FB', color: '#1A5FAD' }

  return (
    <div style={{
      background: 'var(--bg-1)', border: '0.5px solid var(--line-1)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
      cursor: 'pointer', transition: 'border-color .15s',
    }}
      onClick={onGoToProcess}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#E8461A'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line-1)'}>

      {/* Image area */}
      <div style={{ height: 80, background: 'var(--bg-2)', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        {imgSrc
          ? <img src={imgSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--line-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 9"/>
            </svg>
        }
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: statusBadge.bg, color: statusBadge.color,
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, lineHeight: 1.5,
        }}>{statusBadge.label}</div>
      </div>

      {/* Content */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 16 }}>
          {product.description || ''}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div>
            <div className="num" style={{ fontSize: 14, fontWeight: 500 }}>{warehouseTotal}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>倉庫庫存</div>
          </div>
          <div>
            <div className="num" style={{ fontSize: 14, fontWeight: 500, color: '#185FA5' }}>{inTransitTotal}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>加工中</div>
          </div>
        </div>
      </div>

      {/* Bottom link row */}
      <div style={{
        padding: '7px 12px', borderTop: '0.5px solid var(--line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: '加工流程', icon: Icon.Flow, action: onGoToProcess },
            { label: '訂單',     icon: Icon.Order, action: onGoToOrders },
          ].map(({ label, icon: Ic, action }) => (
            <button key={label} onClick={e => { e.stopPropagation(); action() }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = '#E8461A'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
              <Ic />{label}
            </button>
          ))}
        </div>
        {orderCount > 0 && (
          <span style={{ background: '#FEE9E4', color: '#E8461A', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, lineHeight: 1.5 }}>
            訂單 {orderCount}
          </span>
        )}
      </div>
    </div>
  )
}

function OrderRow({ order, product, clientName, onGoToOrders }) {
  const [imgSrc, setImgSrc] = useState(null)
  useEffect(() => {
    if (product?.id) {
      const stored = localStorage.getItem(`prod-img-${product.id}`)
      if (stored) setImgSrc(stored)
    }
  }, [product?.id])

  const completed = order.alloc || 0
  const total = order.qty || 0
  const remaining = Math.max(0, total - completed)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const barColor = pct >= 80 ? '#1A7A3C' : pct >= 30 ? '#BA7517' : '#E8461A'

  const dueStr = order.due || ''
  const dueDate = dueStr ? new Date(dueStr) : null
  const isOverdue = dueDate && !isNaN(dueDate) && dueDate < new Date()
  const dueDisplay = dueDate && !isNaN(dueDate)
    ? `${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`
    : '—'

  return (
    <div onClick={() => onGoToOrders && onGoToOrders(order.productId)}
      style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-lg)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F0EFE8'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}>
      {/* Thumbnail */}
      <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-3)', display: 'grid', placeItems: 'center' }}>
        {imgSrc
          ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 9"/>
            </svg>
        }
      </div>
      {/* Product info */}
      <div style={{ width: 80, flexShrink: 0, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product?.name || '—'}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName || '—'}</div>
      </div>
      {/* Progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 5, background: 'var(--line-1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 3 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>完成 {completed.toLocaleString()} 件</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>剩 {remaining.toLocaleString()} 件</span>
        </div>
      </div>
      {/* Percentage */}
      <div style={{ minWidth: 40, textAlign: 'right', fontSize: 14, fontWeight: 500, color: barColor, flexShrink: 0 }}>{pct}%</div>
      {/* Due date */}
      <div style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? '#A32D2D' : '#1A1A1A', flexShrink: 0 }}>{dueDisplay}</div>
      {/* Chevron */}
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

function BrandRow({ brand, products }) {
  const assignedNames = (brand.products || []).map(p => p.name).join('、') || '—'
  const initials = brand.name?.slice(0, 1) || '?'
  const [copied, setCopied] = useState(false)

  function copyLink(e) {
    e.stopPropagation()
    const url = `${window.location.origin}/brand/${brand.token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div style={{ background: '#F8F8F6', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F0EFE8'}
      onMouseLeave={e => e.currentTarget.style.background = '#F8F8F6'}>
      <div style={{ width: 28, height: 28, borderRadius: 999, background: '#E8461A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{brand.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignedNames}</div>
      </div>
      <button onClick={copyLink} title="複製設計師連結" style={{
        flexShrink: 0, border: copied ? '1px solid #1A7A3C' : '1px solid var(--line-2)',
        background: copied ? '#E6F4EC' : '#fff', borderRadius: 6,
        padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 500, color: copied ? '#1A7A3C' : 'var(--text-2)',
        transition: 'all 0.15s',
      }}>
        {copied
          ? <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        }
        {copied ? '已複製' : '分享連結'}
      </button>
    </div>
  )
}

// ─── Page: Overview ───────────────────────────────────────────
function OverviewPage({ products, logs, orders, onGoToProcess, onGoToParts, onGoToLog, onGoToBrands, onGoToOrders }) {
  const [brands, setBrands] = useState([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [tokenMap, setTokenMap] = useState({}) // product_id → label

  useEffect(() => {
    apiFetch('/api/brands').then(r => r.json()).then(d => setBrands(d)).catch(() => {}).finally(() => setBrandsLoading(false))
    apiFetch('/api/designer-tokens').then(r => r.json()).then(tokens => {
      const map = {}
      tokens.forEach(t => { if (t.label && !map[t.product_id]) map[t.product_id] = t.label })
      setTokenMap(map)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Sub-header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>生產看板</div>
      </div>

      {/* Section 1: Products */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: '#FEE9E4', display: 'grid', placeItems: 'center', color: '#E8461A', flexShrink: 0 }}>
              <Icon.Box />
            </div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>產品總覽</span>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{products.length} 項</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['加工流程', () => onGoToProcess(null)], ['零件管理', () => onGoToParts(null)]].map(([label, fn]) => (
              <button key={label} onClick={fn} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-3)', padding: 0, fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#E8461A'; e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.textDecoration = 'none' }}>
                {label} →
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          {products.map(p => (
            <ProductOverviewCard key={p.id} product={p} orders={orders.filter(o => o.productId === p.id)}
              onGoToProcess={() => onGoToProcess(p)}
              onGoToOrders={() => onGoToOrders(p.id)}
            />
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '40px 0', color: 'var(--text-4)', fontSize: 13, textAlign: 'center' }}>尚無產品</div>
          )}
        </div>
      </div>

      {/* Section 2 + 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Orders */}
        <div>
          <OvSectionHead icon={Icon.Order} title="訂單總覽" count={`${orders.length} 筆`} link2Label="訂單管理" onLink2={() => onGoToOrders(null)} linkLabel="進出貨登記" onLink={onGoToLog} />
          {orders.length === 0
            ? <div style={{ padding: '24px 16px', background: 'var(--bg-2)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 10 }}>尚無訂單</div>
                <button onClick={() => onGoToOrders(null)} className="btn primary" style={{ fontSize: 12, padding: '6px 14px' }}>＋ 新增訂單</button>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orders.map(o => (
                  <OrderRow key={o.id} order={o}
                    product={products.find(p => p.id === o.productId)}
                    clientName={tokenMap[o.productId]}
                    onGoToOrders={onGoToOrders}
                  />
                ))}
                <div style={{ fontSize: 12, textAlign: 'center', padding: '6px 0', color: 'var(--text-3)' }}>
                  其他產品尚無訂單 ·{' '}
                  <span onClick={() => onGoToOrders(null)} style={{ color: '#E8461A', cursor: 'pointer' }}>新增訂單</span>
                </div>
              </div>
          }
        </div>

        {/* Brands */}
        <div>
          <OvSectionHead icon={Icon.Brand} title="品牌總覽" count={`${brands.length} 個`} linkLabel="設計師管理" onLink={onGoToBrands} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brandsLoading
              ? [1, 2, 3].map(i => <div key={i} style={{ height: 50, borderRadius: 8, background: '#F0EFE8' }} />)
              : brands.length === 0
                ? <div style={{ padding: '20px', color: 'var(--text-4)', fontSize: 13, textAlign: 'center', background: '#F8F8F6', borderRadius: 8 }}>尚無品牌</div>
                : brands.map(b => <BrandRow key={b.id} brand={b} products={products} />)
            }
          </div>
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
function partsToRows(data) {
  return data.map(part => {
    const stages = part.stages || []
    const stations = stages.map(st => {
      const inTransit = st.in_transit || 0
      const defectRate = (st.total_returned || 0) > 0
        ? (st.total_defect || 0) / st.total_returned * 100
        : null
      return {
        id: st.id,
        vendor: st.factory_name,
        action: st.action_name,
        inTransit,
        totalSent: st.total_sent || 0,
        totalReturned: st.total_returned || 0,
        defectRate,
        status: inTransit > 0 ? 'current' : (st.total_returned > 0 ? 'done' : ((st.total_sent || 0) > 0 ? 'current' : 'wait')),
      }
    })

    const warehouseStock = part.warehouse_stock || 0
    const defectStock = part.defect_stock || 0
    const lastStage = stages[stages.length - 1]
    const anyInTransit = stations.some(s => s.inTransit > 0)
    const lastReturned = lastStage?.total_returned || 0
    const lastSent = lastStage?.total_sent || 0

    let state
    if (lastSent > 0 && lastReturned >= lastSent && warehouseStock > 0) {
      state = 'complete'
    } else if (!anyInTransit && warehouseStock > 0 && lastReturned > 0) {
      state = 'done'
    } else if (anyInTransit) {
      state = 'process'
    } else {
      state = 'wait'
    }

    return {
      id: part.id,
      name: part.name,
      skus: part.skus?.map(s => s.color_name) || [],
      rawSkus: part.skus || [],
      warehouseStock,
      defectStock,
      state,
      stations,
      finished: warehouseStock,
      complete: state === 'complete',
    }
  })
}

function StageCard({ stage }) {
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef(null)

  const inTransit = stage.in_transit || 0
  const totalReturned = stage.total_returned || 0
  const totalSent = stage.total_sent || 0
  const totalDefect = stage.total_defect || 0
  const hasData = totalSent > 0

  const isDone = hasData && inTransit === 0 && totalReturned > 0
  const isCurrent = inTransit > 0
  const defectRate = totalReturned > 0 ? (totalDefect / totalReturned * 100) : null
  const defectDisplay = defectRate !== null ? `${defectRate.toFixed(1)}%` : '—'

  const tooltipRect = hovered && cardRef.current ? cardRef.current.getBoundingClientRect() : null

  if (!hasData) {
    return (
      <div style={{
        width: 120, height: 110, flexShrink: 0, alignSelf: 'flex-start',
        borderRadius: 'var(--r-md)', padding: '9px 11px',
        background: 'var(--bg-1)', border: '0.5px dashed var(--line-2)',
        opacity: 0.7, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--text-3)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)' }}>等待中</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.factory_name}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.action_name}</div>
        <div className="num" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-3)' }}>—</div>
      </div>
    )
  }

  const bg = isDone ? 'var(--bg-2)' : isCurrent ? '#FEF6F4' : 'var(--bg-1)'
  const border = isCurrent ? '1.5px solid #E8461A' : '0.5px solid var(--line-1)'
  const dotColor = isDone ? '#1A7A3C' : isCurrent ? '#E8461A' : 'var(--text-4)'
  const statusLabel = isDone ? '完成' : isCurrent ? '加工中' : '等待中'
  const statusColor = isDone ? '#1A7A3C' : isCurrent ? '#E8461A' : 'var(--text-4)'
  const mainNum = isDone ? totalReturned : isCurrent ? inTransit : null
  const mainNumColor = isCurrent ? '#E8461A' : 'var(--text-1)'
  const mainLabel = isDone ? '回廠件數' : isCurrent ? '加工中件數' : '尚未送出'

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', width: 120, height: 110, flexShrink: 0, alignSelf: 'flex-start',
        borderRadius: 'var(--r-md)', padding: '9px 11px', border, background: bg,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: dotColor, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 10, fontWeight: 500, color: statusColor }}>{statusLabel}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.factory_name}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-1)', marginBottom: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.action_name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="num" style={{ fontSize: 18, fontWeight: 500, color: mainNumColor }}>
          {mainNum !== null ? mainNum.toLocaleString() : '—'}
        </span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{mainLabel}</div>

      {tooltipRect && (
        <div style={{
          position: 'fixed', left: tooltipRect.left, top: tooltipRect.bottom + 5,
          background: 'var(--text-1)', color: 'var(--bg-1)',
          borderRadius: 'var(--r-md)', padding: '8px 10px',
          fontSize: 11, zIndex: 50, pointerEvents: 'none', whiteSpace: 'nowrap',
          opacity: 1, transition: 'opacity 150ms ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ opacity: 0.65 }}>送出</span>
            <span className="num">{totalSent} 件</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 3 }}>
            <span style={{ opacity: 0.65 }}>回廠</span>
            <span className="num">{totalReturned} 件</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 3 }}>
            <span style={{ opacity: 0.65 }}>不良</span>
            <span className="num">{defectDisplay}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// SKU 分列版加工站卡片 —— 追零件 tab 展開後，同一站底下每個顏色各自一張、比 StageCard 矮
function SkuStageCard({ stage, skuColor, breakdown, sent }) {
  const qty = breakdown[skuColor]?.[stage.id] || 0
  const hasSent = sent[skuColor]?.has(stage.id) || false
  const isCurrent = qty > 0
  const isDone = !isCurrent && hasSent

  if (!hasSent) {
    return (
      <div style={{
        width: 110, height: 90, flexShrink: 0, alignSelf: 'flex-start',
        borderRadius: 'var(--r-md)', padding: '7px 9px',
        background: 'var(--bg-1)', border: '0.5px dashed var(--line-2)',
        opacity: 0.35, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--text-3)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)' }}>等待中</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.factory_name}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', marginBottom: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.action_name}</div>
        <div className="num" style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-3)' }}>—</div>
      </div>
    )
  }

  const bg = isDone ? 'var(--bg-2)' : isCurrent ? '#FEF6F4' : 'var(--bg-1)'
  const border = isCurrent ? '1.5px solid #E8461A' : '0.5px solid var(--line-1)'
  const dotColor = isDone ? '#1A7A3C' : isCurrent ? '#E8461A' : 'var(--text-4)'
  const statusLabel = isDone ? '完成' : '加工中'
  const mainNum = isDone ? '✓' : qty
  const mainNumColor = isCurrent ? '#E8461A' : isDone ? '#1A7A3C' : 'var(--text-1)'

  return (
    <div style={{
      width: 110, height: 90, flexShrink: 0, alignSelf: 'flex-start',
      borderRadius: 'var(--r-md)', padding: '7px 9px', border, background: bg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: dotColor, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 10, fontWeight: 500, color: dotColor }}>{statusLabel}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.factory_name}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-1)', marginBottom: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', minWidth: 0 }}>{stage.action_name}</div>
      <div className="num" style={{ fontSize: 15, fontWeight: 500, color: mainNumColor }}>{typeof mainNum === 'number' ? mainNum.toLocaleString() : mainNum}</div>
    </div>
  )
}

// 品檢中卡片 —— 零件從加工廠回來、還沒分批點貨決定入庫/重工/報廢時，
// 接在加工站卡片流程的最後面（回廠之後、入庫之前）
function QcPendingCard({ qty, stockedTotal }) {
  return (
    <div style={{
      width: 130, minHeight: 110, flexShrink: 0, alignSelf: 'flex-start',
      borderRadius: 'var(--r-md)', padding: '9px 11px',
      border: '1.5px solid #185FA5', background: '#EEF5FC',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ width: 5, height: 5, borderRadius: 999, background: '#185FA5', flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 10, fontWeight: 500, color: '#185FA5' }}>品檢中</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>廠內</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-1)', marginBottom: 7 }}>品檢點貨</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="num" style={{ fontSize: 18, fontWeight: 500, color: '#185FA5' }}>{qty.toLocaleString()}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>待點貨</div>
      <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 'auto', paddingTop: 6, lineHeight: 1.5 }}>
        <div>已入庫 {stockedTotal}</div>
        <div>待處理 {qty}</div>
      </div>
    </div>
  )
}

function qcConnector(key) {
  return <span key={key} style={{ color: '#185FA5', userSelect: 'none', flexShrink: 0, alignSelf: 'center', fontSize: 14, opacity: 1 }}>›</span>
}

function InTransitSummary({ parts }) {
  const factoryMap = {}
  for (const part of parts) {
    for (const stage of (part.stages || [])) {
      if ((stage.in_transit || 0) > 0) {
        factoryMap[stage.factory_name] = (factoryMap[stage.factory_name] || 0) + stage.in_transit
      }
    }
  }
  const entries = Object.entries(factoryMap)
  if (entries.length === 0) return null
  return (
    <div style={{
      background: '#FEF6F4', border: '0.5px solid #E8461A', borderRadius: 'var(--r-md)',
      padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, flexShrink: 0 }}>加工中總覽</span>
      {entries.flatMap(([name, qty], i) => [
        ...(i > 0 ? [<span key={`sep${i}`} style={{ width: 1, height: 12, background: 'var(--line-1)', flexShrink: 0, display: 'inline-block' }} />] : []),
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>{name}</span>
          <span className="num" style={{ fontSize: 12, fontWeight: 500, color: '#E8461A' }}>{qty}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>件</span>
        </div>,
      ])}
    </div>
  )
}

function calcPartStatus(stages) {
  if (stages.some(s => (s.in_transit || 0) > 0)) return 'processing'
  if (stages.some(s => (s.total_returned || 0) > 0)) return 'returned'
  if (stages.some(s => (s.total_sent || 0) > 0)) return 'sent'
  return 'pending'
}

// 檢查 SKU 分列加總是否等於加工站的權威在途數（process_stages.in_transit）。
// 歷史紀錄若缺顏色標記或顏色改過名，分色加總會兜不起來，此時整個零件退回單排卡片，
// 避免顯示誤導性的分色數字。
function skuBreakdownReliable(part, breakdown) {
  const skuNames = (part.skus || []).map(s => s.color_name)
  for (const stage of (part.stages || [])) {
    const sum = skuNames.reduce((s, name) => s + (breakdown[name]?.[stage.id] || 0), 0)
    if (sum !== (stage.in_transit || 0)) return false
  }
  return true
}

function SkuAddPopover({ rect, onAdd, onClose }) {
  const [input, setInput] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const submit = (name) => { if (name.trim()) { onAdd(name.trim()); setInput('') } }

  return (
    <div ref={ref} style={{
      position: 'fixed', left: rect.left, top: rect.bottom + 6,
      background: 'var(--bg-1)', border: '0.5px solid var(--line-2)',
      borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-pop)',
      padding: '10px', zIndex: 200, width: 200,
    }}>
      <input
        autoFocus className="input"
        style={{ fontSize: 13, padding: '6px 10px', marginBottom: 8 }}
        placeholder="顏色名稱"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(input); if (e.key === 'Escape') onClose() }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        {Object.entries(SKU_COLORS).map(([name, color]) => (
          <button key={name} title={name} onClick={() => submit(name)} style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.12)', background: color,
            cursor: 'pointer', flexShrink: 0, padding: 0,
          }} />
        ))}
      </div>
      <button className="btn primary" style={{ fontSize: 12, padding: '5px 0', width: '100%' }}
        onClick={() => submit(input)}>新增</button>
    </div>
  )
}

function StageOrderModal({ parts, mode, onClose, onReload }) {
  const [selectedPartId, setSelectedPartId] = useState(parts[0]?.id || '')
  const [localStages, setLocalStages] = useState([])
  const [newFactory, setNewFactory] = useState('')
  const [newAction, setNewAction] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (!selectedPartId) return
    const part = parts.find(p => p.id === selectedPartId)
    const stages = [...(part?.stages || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    setLocalStages(stages)
    setConfirmDeleteId(null)
  }, [selectedPartId])

  const moveUp = (i) => {
    if (i === 0) return
    setLocalStages(s => { const a = [...s]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a })
  }
  const moveDown = (i) => {
    if (i >= localStages.length - 1) return
    setLocalStages(s => { const a = [...s]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a })
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
      for (let i = 0; i < localStages.length; i++) {
        const st = localStages[i]
        await apiFetch(`/api/parts/${selectedPartId}/stages/${st.id}`, {
          method: 'PUT',
          body: JSON.stringify({ factory_name: st.factory_name, action_name: st.action_name, sort_order: i }),
        })
      }
      onReload(); onClose()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const addStage = async () => {
    if (!newFactory.trim() || !newAction.trim()) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/parts/${selectedPartId}/stages`, {
        method: 'POST',
        body: JSON.stringify({ factory_name: newFactory.trim(), action_name: newAction.trim(), sort_order: localStages.length }),
      })
      const data = await res.json()
      setLocalStages(s => [...s, { id: data.id, factory_name: newFactory.trim(), action_name: newAction.trim(), sort_order: s.length }])
      setNewFactory(''); setNewAction('')
      onReload()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const deleteStage = async (stageId) => {
    setSaving(true)
    try {
      await apiFetch(`/api/parts/${selectedPartId}/stages/${stageId}`, { method: 'DELETE' })
      setLocalStages(s => s.filter(st => st.id !== stageId))
      setConfirmDeleteId(null)
      onReload()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  const title = mode === 'add' ? '新增加工站' : '調整加工站順序'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--bg-1)', borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 460,
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-pop)',
      }}>
        {/* header */}
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--line-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}><Icon.X /></button>
        </div>

        {/* part picker */}
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--line-1)' }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>選擇零件</label>
          <select className="select" style={{ fontSize: 13 }} value={selectedPartId}
            onChange={e => setSelectedPartId(e.target.value)}>
            {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* stage list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {localStages.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>尚無加工站</div>
          ) : localStages.map((stage, i) => (
            <div key={stage.id} style={{
              padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '0.5px solid var(--line-1)',
              background: confirmDeleteId === stage.id ? 'var(--bad-tint)' : 'transparent',
            }}>
              <Icon.Grip />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{stage.factory_name}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{stage.action_name}</div>
              </div>
              {confirmDeleteId === stage.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--bad)', whiteSpace: 'nowrap' }}>確定刪除?</span>
                  <button className="btn danger" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => deleteStage(stage.id)} disabled={saving}>刪除</button>
                  <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setConfirmDeleteId(null)}>取消</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <button className="btn ghost" style={{ padding: '3px 7px', fontSize: 13, lineHeight: 1 }} onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
                  <button className="btn ghost" style={{ padding: '3px 7px', fontSize: 13, lineHeight: 1 }} onClick={() => moveDown(i)} disabled={i >= localStages.length - 1}>↓</button>
                  <button className="btn ghost" style={{ padding: '3px 6px', color: 'var(--text-4)' }} onClick={() => setConfirmDeleteId(stage.id)}><Icon.X /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* add form */}
        {mode === 'add' && (
          <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--line-1)', background: 'var(--bg-2)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, fontWeight: 500 }}>新增加工站</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" placeholder="加工廠名稱" value={newFactory}
                onChange={e => setNewFactory(e.target.value)} style={{ fontSize: 13, flex: 1 }} />
              <input className="input" placeholder="動作名稱" value={newAction}
                onChange={e => setNewAction(e.target.value)} style={{ fontSize: 13, flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') addStage() }} />
            </div>
            <button className="btn primary" style={{ fontSize: 13 }} onClick={addStage}
              disabled={saving || !newFactory.trim() || !newAction.trim()}>
              {saving ? '儲存中…' : '新增'}
            </button>
          </div>
        )}

        {/* footer */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--line-1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {mode === 'reorder' ? (
            <>
              <button className="btn" onClick={onClose}>取消</button>
              <button className="btn primary" onClick={saveOrder} disabled={saving}>{saving ? '儲存中…' : '儲存順序'}</button>
            </>
          ) : (
            <button className="btn" onClick={onClose}>關閉</button>
          )}
        </div>
      </div>
    </div>
  )
}

function PartView({ parts, skuEditMode, onReload }) {
  const [editingNameId, setEditingNameId] = useState(null)
  const [editNameVal, setEditNameVal] = useState('')
  const [skuPopover, setSkuPopover] = useState(null) // null | { partId, rect }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!skuEditMode) { setEditingNameId(null); setEditNameVal(''); setSkuPopover(null) }
  }, [skuEditMode])

  async function saveName(partId) {
    if (!editNameVal.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/api/parts/${partId}`, { method: 'PUT', body: JSON.stringify({ name: editNameVal.trim() }) })
      setEditingNameId(null)
      onReload?.()
    } finally { setSaving(false) }
  }

  async function deleteSku(partId, skuId) {
    setSaving(true)
    try {
      await apiFetch(`/api/parts/${partId}/skus/${skuId}`, { method: 'DELETE' })
      onReload?.()
    } finally { setSaving(false) }
  }

  async function addSku(partId, colorName) {
    setSaving(true)
    try {
      await apiFetch(`/api/parts/${partId}/skus`, { method: 'POST', body: JSON.stringify({ color_name: colorName }) })
      setSkuPopover(null)
      onReload?.()
    } finally { setSaving(false) }
  }

  const statusConfig = {
    processing: { label: '加工中', bg: '#FEE9E4', color: '#E8461A' },
    returned:   { label: '已回廠', bg: 'var(--ok-tint)', color: 'var(--ok)' },
    sent:       { label: '已送出', bg: 'var(--accent-tint)', color: 'var(--accent)' },
    pending:    { label: '等待中', bg: 'var(--bg-3)', color: 'var(--text-4)' },
  }
  return (
    <div>
      {parts.map(part => {
        const stages = part.stages || []
        const status = calcPartStatus(stages)
        const badge = statusConfig[status]
        return (
          <div key={part.id} style={{
            background: 'var(--bg-1)', border: '0.5px solid var(--line-1)',
            borderRadius: 'var(--r-lg)', marginBottom: 8, overflow: 'hidden',
            opacity: status === 'pending' ? 0.82 : 1,
          }}>
            <div style={{
              padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '0.5px solid var(--line-1)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Part name */}
                {skuEditMode && editingNameId === part.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <input autoFocus className="input" style={{ fontSize: 13, padding: '4px 8px', width: 150 }}
                      value={editNameVal}
                      onChange={e => setEditNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(part.id); if (e.key === 'Escape') setEditingNameId(null) }}
                    />
                    <button className="btn primary" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => saveName(part.id)} disabled={saving}>儲存</button>
                    <button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => setEditingNameId(null)}>取消</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: skuEditMode ? 6 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{part.name}</span>
                    {skuEditMode && (
                      <button className="btn ghost" style={{ padding: '2px 5px' }}
                        onClick={() => { setEditingNameId(part.id); setEditNameVal(part.name) }}>
                        <Icon.Edit />
                      </button>
                    )}
                  </div>
                )}
                {/* SKUs row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', position: 'relative' }}>
                  {(part.skus || []).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <SkuDot name={s.color_name} hex={s.color_hex} size={7} />
                      {skuEditMode && (
                        <button onClick={() => deleteSku(part.id, s.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: 'var(--text-4)', display: 'flex', alignItems: 'center', lineHeight: 1,
                        }} disabled={saving}><Icon.X /></button>
                      )}
                    </div>
                  ))}
                  {skuEditMode && (
                    <button className="btn ghost" style={{ padding: '1px 7px', fontSize: 11, gap: 3, display: 'inline-flex', alignItems: 'center' }}
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setSkuPopover(skuPopover?.partId === part.id ? null : { partId: part.id, rect })
                      }}>
                      <Icon.Plus />SKU
                    </button>
                  )}
                  {skuPopover?.partId === part.id && (
                    <SkuAddPopover rect={skuPopover.rect} onAdd={(c) => addSku(part.id, c)} onClose={() => setSkuPopover(null)} />
                  )}
                  {(part.warehouse_stock || 0) > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--text-4)', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 3 }}>倉 {part.warehouse_stock}</span>
                  )}
                  {(part.defect_stock || 0) > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--bad)', background: 'var(--bad-tint)', padding: '1px 5px', borderRadius: 3 }}>⚠ {part.defect_stock}</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0, marginLeft: 8 }}>
                {badge.label}
              </span>
            </div>
            {(stages.length > 0 || (part.qc_pending_qty || 0) > 0) && (
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto' }}>
                {stages.flatMap((stage, i) => {
                  const hasData = (stage.total_sent || 0) > 0
                  const nextHasData = i < stages.length - 1 && (stages[i + 1]?.total_sent || 0) > 0
                  return [
                    <StageCard key={stage.id} stage={stage} />,
                    ...(i < stages.length - 1 ? [
                      <span key={`a${i}`} style={{
                        color: 'var(--text-4)', userSelect: 'none', flexShrink: 0, alignSelf: 'center',
                        fontSize: hasData || nextHasData ? 14 : 12,
                        opacity: hasData || nextHasData ? 1 : 0.3,
                      }}>›</span>,
                    ] : []),
                  ]
                })}
                {(part.qc_pending_qty || 0) > 0 && [
                  stages.length > 0 && qcConnector('qc-a'),
                  <QcPendingCard key="qc" qty={part.qc_pending_qty} stockedTotal={part.qc_stocked_total || 0} />,
                ]}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function calcFactoryGroups(parts) {
  const factoryMap = {}
  for (const part of parts) {
    for (const stage of (part.stages || [])) {
      const fname = stage.factory_name
      if (!factoryMap[fname]) {
        factoryMap[fname] = { name: fname, totalInTransit: 0, stages: [], allParts: [] }
      }
      const g = factoryMap[fname]
      g.totalInTransit += (stage.in_transit || 0)
      g.stages.push(stage)
      if (!g.allParts.find(p => p.id === part.id)) g.allParts.push(part)
    }
  }
  return Object.values(factoryMap).map(g => {
    const isActive = g.totalInTransit > 0
    const sentStages = g.stages.filter(s => (s.total_sent || 0) > 0)
    const allReturned = sentStages.length > 0 && sentStages.every(s => (s.total_returned || 0) >= (s.total_sent || 0))
    const isDone = !isActive && allReturned
    const isWaiting = !isActive && !isDone
    const activeParts = g.allParts.filter(p =>
      (p.stages || []).some(s => s.factory_name === g.name && (s.in_transit || 0) > 0)
    )
    return { name: g.name, totalInTransit: g.totalInTransit, activeParts, isActive, isDone, isWaiting }
  }).sort((a, b) => {
    const pri = x => x.isActive ? 0 : x.isDone ? 1 : 2
    if (pri(a) !== pri(b)) return pri(a) - pri(b)
    if (a.isActive) return b.totalInTransit - a.totalInTransit
    return a.name.localeCompare(b.name)
  })
}

function FactoryView({ parts }) {
  const [expandedParts, setExpandedParts] = useState({})
  const [breakdowns, setBreakdowns] = useState({})
  const groups = calcFactoryGroups(parts)
  if (groups.length === 0) {
    return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>尚無加工廠資料，請先新增加工站</div>
  }
  const togglePart = (factory, part) => {
    const key = `${factory}__${part.id}`
    const nowOpen = !expandedParts[key]
    setExpandedParts(e => ({ ...e, [key]: nowOpen }))
    if (nowOpen && (part.skus || []).length > 0 && !breakdowns[part.id]) {
      setBreakdowns(b => ({ ...b, [part.id]: { loading: true, breakdown: {}, sent: {} } }))
      apiFetch(`/api/parts/${part.id}/sku-breakdown`).then(r => r.json()).then(data => {
        const sentSets = {}
        for (const color in (data.sent || {})) sentSets[color] = new Set(data.sent[color])
        const breakdown = data.breakdown || {}
        setBreakdowns(b => ({ ...b, [part.id]: { loading: false, breakdown, sent: sentSets, reliable: skuBreakdownReliable(part, breakdown) } }))
      }).catch(() => {
        setBreakdowns(b => ({ ...b, [part.id]: { loading: false, breakdown: {}, sent: {}, reliable: false } }))
      })
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(({ name, totalInTransit, activeParts, isActive, isDone, isWaiting }) => {
        const badge = isActive
          ? { label: `● 加工中 ${totalInTransit} 件`, bg: '#FEE9E4', color: '#E8461A' }
          : isDone
            ? { label: '✓ 已完成', bg: 'var(--ok-tint)', color: 'var(--ok)' }
            : { label: '— 目前無在製零件', bg: 'var(--bg-3)', color: 'var(--text-3)' }
        const hasParts = isActive && activeParts.length > 0
        return (
          <div key={name} style={{ opacity: isDone ? 0.5 : isWaiting ? 0.4 : 1 }}>
            <div style={{
              padding: '9px 13px', background: 'var(--bg-1)',
              border: '0.5px solid var(--line-1)',
              borderRadius: hasParts ? 'var(--r-lg) var(--r-lg) 0 0' : 'var(--r-lg)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', color: 'var(--text-3)', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21v-13l9-4 9 4v13"/><path d="M13 21v-4a2 2 0 0 0-4 0v4"/><path d="M9 9v.01"/><path d="M15 9v.01"/><path d="M9 13v.01"/><path d="M15 13v.01"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                  {isActive ? `目前加工中 ${totalInTransit} 件` : isDone ? '本批已完成' : '目前無在製零件'}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                {badge.label}
              </span>
            </div>
            {hasParts && (
              <div style={{ border: '0.5px solid var(--line-1)', borderTop: 'none', borderRadius: '0 0 var(--r-lg) var(--r-lg)', background: 'var(--bg-1)' }}>
                {activeParts.map((part, pi) => {
                  const activeStagesHere = (part.stages || []).filter(s =>
                    s.factory_name === name && (s.in_transit || 0) > 0
                  )
                  const inTransitHere = activeStagesHere.reduce((sum, s) => sum + (s.in_transit || 0), 0)
                  const actionLabel = [...new Set(activeStagesHere.map(s => s.action_name))].join('・')
                  const partKey = `${name}__${part.id}`
                  const isExpanded = expandedParts[partKey] ?? false
                  const skus = part.skus || []
                  const bd = breakdowns[part.id]
                  return (
                    <div key={part.id} style={{ borderBottom: pi < activeParts.length - 1 ? '0.5px solid var(--line-1)' : 'none' }}>
                      <div
                        onClick={() => togglePart(name, part)}
                        style={{
                          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
                          cursor: 'pointer', transition: 'background .1s',
                          borderBottom: isExpanded ? '0.5px solid var(--line-1)' : 'none',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{part.name}</span>
                          {(part.skus || []).slice(0, 5).map(s => <SkuDot key={s.id || s.color_name} name={s.color_name} hex={s.color_hex} size={7} />)}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {actionLabel}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0 }}>
                          <span className="num" style={{ fontSize: 16, fontWeight: 500, color: '#E8461A' }}>{inTransitHere}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>件加工中</span>
                        </div>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                      {isExpanded && skus.length > 0 && bd?.loading && (
                        <div style={{ padding: '12px 13px', fontSize: 11, color: 'var(--text-4)', background: 'var(--bg-2)' }}>載入中…</div>
                      )}
                      {isExpanded && skus.length > 0 && bd && !bd.loading && bd.reliable && (
                        <div style={{ background: 'var(--bg-2)' }}>
                          {skus.map((sku, si) => {
                            const color = sku.color_name
                            const breakdown = bd.breakdown || {}
                            const sent = bd.sent || {}
                            return (
                              <div key={sku.id || color} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 13px',
                                borderBottom: si < skus.length - 1 ? '0.5px solid var(--line-1)' : 'none',
                              }}>
                                <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, paddingTop: 9 }}>
                                  <SkuDot name={color} hex={sku.color_hex} size={10} />
                                  <span style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{color}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto' }}>
                                  {(part.stages || []).flatMap((stage, i, arr) => {
                                    const hasSent = sent[color]?.has(stage.id)
                                    const nextHasSent = i < arr.length - 1 && sent[color]?.has(arr[i + 1]?.id)
                                    return [
                                      <SkuStageCard key={stage.id} stage={stage} skuColor={color} breakdown={breakdown} sent={sent} />,
                                      ...(i < arr.length - 1 ? [
                                        <span key={`a${i}`} style={{
                                          color: 'var(--text-4)', userSelect: 'none', flexShrink: 0, alignSelf: 'center',
                                          fontSize: hasSent || nextHasSent ? 14 : 12, opacity: hasSent || nextHasSent ? 1 : 0.3,
                                        }}>›</span>,
                                      ] : []),
                                    ]
                                  })}
                                </div>
                              </div>
                            )
                          })}
                          {(part.qc_pending_qty || 0) > 0 && (
                            <div style={{ padding: '12px 13px', display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto' }}>
                              {(part.stages || []).length > 0 && qcConnector('qc-a')}
                              <QcPendingCard qty={part.qc_pending_qty} stockedTotal={part.qc_stocked_total || 0} />
                            </div>
                          )}
                        </div>
                      )}
                      {isExpanded && (skus.length === 0 || (bd && !bd.loading && !bd.reliable)) && (
                        <div style={{ padding: '12px 13px', display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto', background: 'var(--bg-2)' }}>
                          {(part.stages || []).flatMap((stage, i, arr) => {
                            const hasData = (stage.total_sent || 0) > 0
                            const nextHasData = i < arr.length - 1 && (arr[i + 1]?.total_sent || 0) > 0
                            return [
                              <StageCard key={stage.id} stage={stage} />,
                              ...(i < arr.length - 1 ? [
                                <span key={`a${i}`} style={{
                                  color: 'var(--text-4)', userSelect: 'none', flexShrink: 0, alignSelf: 'center',
                                  fontSize: hasData || nextHasData ? 14 : 12, opacity: hasData || nextHasData ? 1 : 0.3,
                                }}>›</span>,
                              ] : []),
                            ]
                          })}
                          {(part.qc_pending_qty || 0) > 0 && [
                            (part.stages || []).length > 0 && qcConnector('qc-a'),
                            <QcPendingCard key="qc" qty={part.qc_pending_qty} stockedTotal={part.qc_stocked_total || 0} />,
                          ]}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PartViewExpandable({ parts }) {
  const [expanded, setExpanded] = useState({})
  const [breakdowns, setBreakdowns] = useState({})
  const statusConfig = {
    processing: { label: '加工中', bg: '#FEE9E4', color: '#E8461A' },
    returned:   { label: '已回廠', bg: 'var(--ok-tint)', color: 'var(--ok)' },
    sent:       { label: '已送出', bg: 'var(--accent-tint)', color: 'var(--accent)' },
    pending:    { label: '等待中', bg: 'var(--bg-3)', color: 'var(--text-4)' },
  }
  if (!parts.length) {
    return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>尚無零件資料</div>
  }

  function toggleOpen(part) {
    const nowOpen = !(expanded[part.id] ?? false)
    setExpanded(e => ({ ...e, [part.id]: nowOpen }))
    if (nowOpen && (part.skus || []).length > 0 && !breakdowns[part.id]) {
      setBreakdowns(b => ({ ...b, [part.id]: { loading: true, breakdown: {}, sent: {} } }))
      apiFetch(`/api/parts/${part.id}/sku-breakdown`).then(r => r.json()).then(data => {
        const sentSets = {}
        for (const color in (data.sent || {})) sentSets[color] = new Set(data.sent[color])
        const breakdown = data.breakdown || {}
        setBreakdowns(b => ({ ...b, [part.id]: { loading: false, breakdown, sent: sentSets, reliable: skuBreakdownReliable(part, breakdown) } }))
      }).catch(() => {
        setBreakdowns(b => ({ ...b, [part.id]: { loading: false, breakdown: {}, sent: {}, reliable: false } }))
      })
    }
  }

  return (
    <div>
      {parts.map(part => {
        const stages = part.stages || []
        const status = calcPartStatus(stages)
        const badge = statusConfig[status]
        const isOpen = expanded[part.id] ?? false
        const skus = part.skus || []
        const bd = breakdowns[part.id]
        return (
          <div key={part.id} style={{
            background: 'var(--bg-1)', border: '0.5px solid var(--line-1)',
            borderRadius: 'var(--r-lg)', marginBottom: 8, overflow: 'hidden',
          }}>
            <div
              onClick={() => toggleOpen(part)}
              style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', borderBottom: isOpen && (stages.length > 0 || (part.qc_pending_qty || 0) > 0) ? '0.5px solid var(--line-1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{part.name}</span>
                <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 999, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                {skus.map(s => <SkuDot key={s.id || s.color_name} name={s.color_name} hex={s.color_hex} size={7} />)}
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0, marginLeft: 8 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {isOpen && skus.length > 0 && bd?.loading && (
              <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-4)' }}>載入中…</div>
            )}

            {isOpen && skus.length > 0 && bd && !bd.loading && bd.reliable && (
              <div>
                {skus.map((sku, si) => {
                  const color = sku.color_name
                  const breakdown = bd.breakdown || {}
                  const sent = bd.sent || {}
                  return (
                    <div key={sku.id || color} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 14px',
                      borderBottom: si < skus.length - 1 ? '0.5px solid var(--line-1)' : 'none',
                    }}>
                      <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, paddingTop: 9 }}>
                        <SkuDot name={color} hex={sku.color_hex} size={10} />
                        <span style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{color}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto' }}>
                        {stages.flatMap((stage, i, arr) => {
                          const hasSent = sent[color]?.has(stage.id)
                          const nextHasSent = i < arr.length - 1 && sent[color]?.has(arr[i + 1]?.id)
                          return [
                            <SkuStageCard key={stage.id} stage={stage} skuColor={color} breakdown={breakdown} sent={sent} />,
                            ...(i < arr.length - 1 ? [
                              <span key={`a${i}`} style={{
                                color: 'var(--text-4)', userSelect: 'none', flexShrink: 0, alignSelf: 'center',
                                fontSize: hasSent || nextHasSent ? 14 : 12, opacity: hasSent || nextHasSent ? 1 : 0.3,
                              }}>›</span>,
                            ] : []),
                          ]
                        })}
                      </div>
                    </div>
                  )
                })}
                {(part.qc_pending_qty || 0) > 0 && (
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto' }}>
                    {stages.length > 0 && qcConnector('qc-a')}
                    <QcPendingCard qty={part.qc_pending_qty} stockedTotal={part.qc_stocked_total || 0} />
                  </div>
                )}
              </div>
            )}

            {isOpen && (skus.length === 0 || (bd && !bd.loading && !bd.reliable)) && (stages.length > 0 || (part.qc_pending_qty || 0) > 0) && (
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 6, overflowX: 'auto' }}>
                {stages.flatMap((stage, i, arr) => {
                  const hasData = (stage.total_sent || 0) > 0
                  const nextHasData = i < arr.length - 1 && (arr[i + 1]?.total_sent || 0) > 0
                  return [
                    <StageCard key={stage.id} stage={stage} />,
                    ...(i < arr.length - 1 ? [
                      <span key={`a${i}`} style={{
                        color: 'var(--text-4)', userSelect: 'none', flexShrink: 0, alignSelf: 'center',
                        fontSize: hasData || nextHasData ? 14 : 12, opacity: hasData || nextHasData ? 1 : 0.3,
                      }}>›</span>,
                    ] : []),
                  ]
                })}
                {(part.qc_pending_qty || 0) > 0 && [
                  stages.length > 0 && qcConnector('qc-a'),
                  <QcPendingCard key="qc" qty={part.qc_pending_qty} stockedTotal={part.qc_stocked_total || 0} />,
                ]}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EditProductPicker({ products, action, onSelect, onClose }) {
  const labels = {
    sku:     '選擇要編輯零件名稱 / SKU 的產品',
    reorder: '選擇要調整加工站順序的產品',
    add:     '選擇要新增加工站的產品',
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'grid', placeItems: 'center', zIndex: 100 }}>
      <div style={{
        background: 'var(--bg-1)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-pop)',
        padding: '20px 22px', width: 340, maxWidth: '90vw',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>選擇產品</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>{labels[action]}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {products.map(p => (
            <button key={p.id} onClick={() => onSelect(p, action)} style={{
              padding: '10px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer',
              background: 'var(--bg-2)', border: '0.5px solid var(--line-1)',
              font: 'inherit', fontSize: 13, fontWeight: 500, textAlign: 'left', color: 'var(--text-1)',
              transition: 'background .1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-2)'}
            >{p.name}</button>
          ))}
        </div>
        <button className="btn ghost" style={{ marginTop: 12, width: '100%', fontSize: 13 }} onClick={onClose}>取消</button>
      </div>
    </div>
  )
}

function ProcessPage({ products, selectedProduct, onSelectProduct, headerActionsSlot, reloadKey }) {
  const [tab, setTab] = useState('factory')
  const [allParts, setAllParts] = useState([])
  const [tabBProd, setTabBProd] = useState(null)
  const [tabBParts, setTabBParts] = useState([])
  const [tabCParts, setTabCParts] = useState([])
  const [editMenuOpen, setEditMenuOpen] = useState(false)
  const [skuEditMode, setSkuEditMode] = useState(false)
  const [stageModal, setStageModal] = useState(null) // { mode, parts, onReload }
  const [editPicker, setEditPicker] = useState(null) // action string
  const menuRef = useRef(null)

  const curProd = selectedProduct || products[0]

  useEffect(() => {
    if (!products.length) return
    if (tab === 'factory') _loadAllParts()
    else if (tab === 'part') {
      if (!tabBProd && products[0]) setTabBProd(products[0])
      else if (tabBProd) _loadTabB(tabBProd.id)
    } else if (tab === 'product' && curProd) _loadTabC(curProd.id)
  }, [tab, reloadKey, products.length])

  useEffect(() => {
    if (tab === 'product' && curProd) _loadTabC(curProd.id)
  }, [curProd?.id])

  useEffect(() => {
    if (tabBProd) _loadTabB(tabBProd.id)
  }, [tabBProd?.id])

  useEffect(() => {
    if (headerActionsSlot) headerActionsSlot.set(null)
    return () => { if (headerActionsSlot) headerActionsSlot.set(null) }
  }, [headerActionsSlot])

  useEffect(() => {
    if (!editMenuOpen) return
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setEditMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [editMenuOpen])

  async function _loadAllParts() {
    const results = await Promise.all(
      products.map(p => apiFetch(`/api/products/${p.id}/parts`).then(r => r.json()).catch(() => []))
    )
    setAllParts(results.flat())
  }
  async function _loadTabB(pid) {
    const data = await apiFetch(`/api/products/${pid}/parts`).then(r => r.json()).catch(() => [])
    setTabBParts(data)
  }
  async function _loadTabC(pid) {
    const data = await apiFetch(`/api/products/${pid}/parts`).then(r => r.json()).catch(() => [])
    setTabCParts(data)
  }

  function handleTabChange(newTab) {
    if (newTab !== 'product') setSkuEditMode(false)
    if (newTab === 'part' && !tabBProd && products.length) setTabBProd(products[0])
    setTab(newTab)
  }

  function handleMenuSelect(action) {
    setEditMenuOpen(false)
    if (tab === 'product' && curProd) {
      if (action === 'sku') setSkuEditMode(true)
      else setStageModal({ mode: action === 'reorder' ? 'reorder' : 'add', parts: tabCParts, onReload: () => _loadTabC(curProd.id) })
    } else {
      setEditPicker(action)
    }
  }

  async function handleEditPickerSelect(prod, action) {
    setEditPicker(null)
    const parts = await apiFetch(`/api/products/${prod.id}/parts`).then(r => r.json()).catch(() => [])
    if (action === 'sku') {
      onSelectProduct(prod)
      setTabCParts(parts)
      setTab('product')
      setSkuEditMode(true)
    } else {
      setStageModal({
        mode: action === 'reorder' ? 'reorder' : 'add',
        parts,
        onReload: async () => {
          const updated = await apiFetch(`/api/products/${prod.id}/parts`).then(r => r.json()).catch(() => [])
          setStageModal(m => m ? { ...m, parts: updated } : null)
          if (tab === 'factory') _loadAllParts()
          else if (tab === 'part' && tabBProd?.id === prod.id) setTabBParts(updated)
          else if (tab === 'product' && curProd?.id === prod.id) setTabCParts(updated)
        },
      })
    }
  }

  const sortedTabBParts = [...tabBParts].sort((a, b) => {
    const ord = { processing: 0, sent: 1, pending: 2, returned: 3 }
    return (ord[calcPartStatus(a.stages || [])] ?? 2) - (ord[calcPartStatus(b.stages || [])] ?? 2)
  })

  const menuItems = [
    { key: 'sku',     label: '編輯零件名稱 / SKU' },
    { key: 'reorder', label: '調整加工站順序' },
    { key: 'add',     label: '新增加工站' },
  ]

  const ProdPill = ({ p, active, onClick }) => (
    <button onClick={onClick} style={{
      padding: '5px 16px', borderRadius: 999, cursor: 'pointer',
      background: active ? 'var(--text-1)' : 'var(--bg-1)',
      color: active ? 'var(--bg-1)' : 'var(--text-3)',
      border: `1px solid ${active ? 'var(--text-1)' : 'var(--line-2)'}`,
      font: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400,
      transition: 'background .12s, color .12s',
    }}>{p.name}</button>
  )

  return (
    <>
      {/* Tab pills + edit dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'factory', label: '追廠商' },
            { key: 'part',    label: '追零件' },
            { key: 'product', label: '追產品' },
          ].map(({ key, label }) => {
            const active = tab === key
            return (
              <button key={key} onClick={() => handleTabChange(key)} style={{
                padding: '5px 16px', borderRadius: 999, cursor: 'pointer',
                background: active ? 'var(--text-1)' : 'var(--bg-1)',
                color: active ? 'var(--bg-1)' : 'var(--text-3)',
                border: `1px solid ${active ? 'var(--text-1)' : 'var(--line-2)'}`,
                font: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'background .12s, color .12s',
              }}>{label}</button>
            )
          })}
        </div>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setEditMenuOpen(v => !v)} style={{
            appearance: 'none', font: 'inherit', fontWeight: 500, fontSize: 13,
            padding: '5px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
            background: 'var(--bg-1)', border: '1px solid var(--line-2)', color: 'var(--text-2)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <Icon.Edit />編輯流程
            <svg viewBox="0 0 10 10" fill="none" width="10" height="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3.5l3 3 3-3"/>
            </svg>
          </button>
          {editMenuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--bg-1)', border: '0.5px solid var(--line-2)',
              borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-pop)',
              minWidth: 190, zIndex: 20, overflow: 'hidden',
            }}>
              {menuItems.map(item => (
                <button key={item.key} onClick={() => handleMenuSelect(item.key)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', fontSize: 13, font: 'inherit',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-1)', borderBottom: item.key !== 'add' ? '0.5px solid var(--line-1)' : 'none',
                  transition: 'background .1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >{item.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SKU edit banner — Tab C only */}
      {skuEditMode && tab === 'product' && (
        <div style={{
          background: 'var(--accent-tint)', border: '1px solid var(--accent-tint-hi)',
          borderRadius: 'var(--r-md)', padding: '9px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.Edit />
            <span style={{ fontWeight: 500, color: 'var(--accent)' }}>編輯零件名稱 / SKU</span>
            <span style={{ color: 'var(--text-3)' }}>— 點擊名稱旁鉛筆圖示修改名稱，點擊 × 刪除色號</span>
          </div>
          <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setSkuEditMode(false)}>完成編輯</button>
        </div>
      )}

      {/* Tab A: 追廠商 */}
      {tab === 'factory' && (
        <>
          <InTransitSummary parts={allParts} />
          <FactoryView parts={allParts} />
        </>
      )}

      {/* Tab B: 追零件 */}
      {tab === 'part' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {products.map(p => <ProdPill key={p.id} p={p} active={tabBProd?.id === p.id} onClick={() => setTabBProd(p)} />)}
          </div>
          {tabBProd
            ? <PartViewExpandable parts={sortedTabBParts} />
            : <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>選擇一個產品，查看零件加工進度</div>
          }
        </>
      )}

      {/* Tab C: 追產品 */}
      {tab === 'product' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {products.map(p => <ProdPill key={p.id} p={p} active={curProd?.id === p.id} onClick={() => onSelectProduct(p)} />)}
          </div>
          <PartView parts={tabCParts} skuEditMode={skuEditMode} onReload={() => _loadTabC(curProd?.id)} />
        </>
      )}

      {editPicker && (
        <EditProductPicker products={products} action={editPicker} onSelect={handleEditPickerSelect} onClose={() => setEditPicker(null)} />
      )}

      {stageModal && (
        <StageOrderModal parts={stageModal.parts} mode={stageModal.mode} onClose={() => setStageModal(null)} onReload={stageModal.onReload} />
      )}
    </>
  )
}

const CELL_H = 52, CELL_W = 110, NAME_W = 160

function ProcessTable({ rows, edit, productImgSrc, onMutate, reloadParts, productId }) {
  const colCount = rows.reduce((m, r) => Math.max(m, r.stations.length), 0)
  const padded = rows.map(r => {
    const sts = r.stations.slice()
    while (sts.length < colCount) sts.push(null)
    return { ...r, stations: sts }
  })

  // drag-edit state
  const [colDrag, setColDrag] = useState(null)
  const [colHover, setColHover] = useState(null)
  const [rowDrag, setRowDrag] = useState(null)
  const [rowHover, setRowHover] = useState(null)
  const [delColAt, setDelColAt] = useState(null)

  // inline expand/edit state
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [editMap, setEditMap] = useState({}) // partId → { name, removedIds: [], newNames: [], addInput: '' }
  const [savingId, setSavingId] = useState(null)

  // new part state
  const [addingPart, setAddingPart] = useState(false)
  const [newPartName, setNewPartName] = useState('')
  const [newPartSkus, setNewPartSkus] = useState([])
  const [newSkuInput, setNewSkuInput] = useState('')

  function openExpand(ri, row) {
    if (expandedIdx === ri) { setExpandedIdx(null); return }
    if (!editMap[row.id]) {
      setEditMap(m => ({ ...m, [row.id]: { name: row.name, removedIds: [], newNames: [], addInput: '' } }))
    }
    setExpandedIdx(ri)
  }

  function toggleSkuRemove(partId, skuId) {
    setEditMap(m => {
      const e = m[partId]
      const removedIds = e.removedIds.includes(skuId)
        ? e.removedIds.filter(id => id !== skuId)
        : [...e.removedIds, skuId]
      return { ...m, [partId]: { ...e, removedIds } }
    })
  }

  function addNewSkuToEdit(partId) {
    const name = (editMap[partId]?.addInput || '').trim()
    if (!name) return
    setEditMap(m => ({ ...m, [partId]: { ...m[partId], newNames: [...m[partId].newNames, name], addInput: '' } }))
  }

  async function savePart(row) {
    const e = editMap[row.id]
    if (!e) return
    setSavingId(row.id)
    try {
      const calls = []
      if (e.name !== row.name) calls.push(apiFetch(`/api/parts/${row.id}`, { method: 'PUT', body: JSON.stringify({ name: e.name }) }))
      for (const skuId of e.removedIds) calls.push(apiFetch(`/api/parts/${row.id}/skus/${skuId}`, { method: 'DELETE' }))
      for (const skuName of e.newNames) calls.push(apiFetch(`/api/parts/${row.id}/skus`, { method: 'POST', body: JSON.stringify({ color_name: skuName }) }))
      await Promise.all(calls)
      setExpandedIdx(null)
      reloadParts()
    } finally { setSavingId(null) }
  }

  async function deletePart(row) {
    if (!confirm(`確認刪除零件「${row.name}」？其所有 SKU 也會一併刪除。`)) return
    setSavingId(row.id)
    try {
      await apiFetch(`/api/parts/${row.id}`, { method: 'DELETE' })
      setExpandedIdx(null)
      reloadParts()
    } finally { setSavingId(null) }
  }

  async function saveNewPart() {
    const name = newPartName.trim()
    if (!name || !productId) return
    setSavingId('new')
    try {
      const res = await apiFetch('/api/parts', { method: 'POST', body: JSON.stringify({ product_id: productId, name }) })
      const { id: partId } = await res.json()
      for (const skuName of newPartSkus) {
        await apiFetch(`/api/parts/${partId}/skus`, { method: 'POST', body: JSON.stringify({ color_name: skuName }) })
      }
      setAddingPart(false); setNewPartName(''); setNewPartSkus([]); setNewSkuInput('')
      reloadParts()
    } finally { setSavingId(null) }
  }

  const moveCol = (from, to) => {
    if (from == null || from === to) return
    onMutate(padded.map(r => {
      const sts = r.stations.slice()
      const [m] = sts.splice(from, 1)
      sts.splice(from < to ? to - 1 : to, 0, m)
      return { ...r, stations: sts }
    }))
  }
  const deleteCol = i => { onMutate(padded.map(r => ({ ...r, stations: r.stations.filter((_, ci) => ci !== i) }))); setDelColAt(null) }
  const addCol = () => { onMutate(padded.map(r => ({ ...r, stations: [...r.stations, { vendor: '—', action: '新加工站', qty: null, status: 'wait' }] }))) }
  const moveRow = (from, to) => {
    if (from == null || from === to) return
    const rs = padded.slice()
    const [m] = rs.splice(from, 1)
    rs.splice(from < to ? to - 1 : to, 0, m)
    onMutate(rs)
  }

  const totalCols = colCount + 1 + (edit ? 1 : 0)

  // shared expand row styles
  const expandRow = {
    background: '#F5F4F0',
    borderTop: '0.5px solid #E8E6E0',
    padding: '10px 14px',
    display: 'flex', alignItems: 'flex-start', gap: 16,
  }
  const expandLabel = { fontSize: 10, color: '#888', marginBottom: 4 }
  const expandInput = { fontSize: 12, padding: '5px 8px', border: '0.5px solid #DDDBD3', borderRadius: 6, fontFamily: 'inherit', background: '#fff', outline: 'none' }
  const skuPill = (bg, border, color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px 3px 6px', borderRadius: 999,
    background: bg, border: `0.5px solid ${border}`,
    fontSize: 11, color,
  })

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
                      <button onClick={e => { e.stopPropagation(); setDelColAt(i) }} className="proc-delx"
                        style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 999, background: '#fff', border: '0.5px solid #EBEBEB', color: '#9A9A95', cursor: 'pointer', padding: 0, display: 'none', placeItems: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#C53A12'; e.currentTarget.style.borderColor = '#C53A12' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9A9A95'; e.currentTarget.style.borderColor = '#EBEBEB' }}>
                        <Icon.X />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {edit && (
                <th style={{ width: 56, padding: 0, borderLeft: '0.5px solid #F0EFE8', background: '#F8F8F6' }}>
                  <div style={{ height: 36, display: 'grid', placeItems: 'center' }}>
                    <button onClick={addCol} style={{ appearance: 'none', font: 'inherit', cursor: 'pointer', background: '#fff', border: '1px dashed #C9C7C0', color: '#888', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8461A'; e.currentTarget.style.color = '#E8461A' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#C9C7C0'; e.currentTarget.style.color = '#888' }}>
                      + 新增
                    </button>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {padded.map((row, ri) => {
              const isDragging = rowDrag === ri
              const isHover = edit && rowHover === ri && rowDrag != null && rowDrag !== ri
              const isExpanded = !edit && expandedIdx === ri
              const e = editMap[row.id]
              return (
                <>
                  <tr
                    key={row.id + ri}
                    onDragOver={edit ? ev => { ev.preventDefault(); setRowHover(ri) } : undefined}
                    onDrop={edit ? ev => { ev.preventDefault(); moveRow(rowDrag, ri); setRowDrag(null); setRowHover(null) } : undefined}
                    style={{ borderTop: '0.5px solid #F0EFE8', background: isHover ? '#EEF4FA' : isExpanded ? '#FAFAF8' : 'transparent', opacity: isDragging ? 0.4 : 1 }}
                  >
                    <td style={{ width: NAME_W, padding: '0 10px 0 14px', verticalAlign: 'middle' }}>
                      <div style={{ height: CELL_H, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {edit ? (
                          <span draggable onDragStart={() => setRowDrag(ri)} onDragEnd={() => { setRowDrag(null); setRowHover(null) }}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab', display: 'inline-flex', flexShrink: 0 }}>
                            <Icon.Grip />
                          </span>
                        ) : (
                          <button onClick={() => openExpand(ri, row)} title="展開編輯" style={{
                            background: 'none', border: 'none', padding: 2, cursor: 'pointer', flexShrink: 0,
                            color: isExpanded ? '#4A4A4A' : '#C8C6C0', display: 'grid', placeItems: 'center',
                            borderRadius: 4, transition: 'color .1s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.color = '#4A4A4A'}
                            onMouseLeave={e => e.currentTarget.style.color = isExpanded ? '#4A4A4A' : '#C8C6C0'}
                          >
                            <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                              <path d="M4 2l4 4-4 4"/>
                            </svg>
                          </button>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            {row.rawSkus.slice(0, 4).map(s => <SkuDot key={s.id || s.color_name} name={s.color_name} hex={s.color_hex} size={7} />)}
                            {row.skus.length > 4 && <span style={{ fontSize: 10, color: '#888' }}>+{row.skus.length - 4}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                            {row.warehouseStock > 0 && (
                              <span style={{ fontSize: 9, color: '#888', background: '#F5F4F0', padding: '1px 4px', borderRadius: 3, lineHeight: 1.5 }}>
                                倉 {row.warehouseStock}
                              </span>
                            )}
                            {row.defectStock > 0 && (
                              <span style={{ fontSize: 9, color: '#C53A12', background: '#FEE9E4', padding: '1px 4px', borderRadius: 3, lineHeight: 1.5 }}>
                                ⚠ {row.defectStock}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {row.stations.map((st, ci) => <StationCell key={ci} st={st} />)}
                    {edit && <td style={{ width: 56, borderLeft: '0.5px solid #F0EFE8' }}><div style={{ height: CELL_H }} /></td>}
                  </tr>

                  {/* Expanded inline edit row */}
                  {isExpanded && e && (
                    <tr key={`exp-${row.id}`}>
                      <td colSpan={totalCols} style={{ padding: 0 }}>
                        <div style={expandRow}>
                          {/* Part name */}
                          <div style={{ flexShrink: 0 }}>
                            <div style={expandLabel}>零件名稱</div>
                            <input value={e.name} onChange={ev => setEditMap(m => ({ ...m, [row.id]: { ...m[row.id], name: ev.target.value } }))}
                              style={{ ...expandInput, width: 120 }} />
                          </div>

                          {/* SKU colours */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={expandLabel}>SKU 顏色</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {row.rawSkus.map(sku => {
                                const removed = e.removedIds.includes(sku.id)
                                return (
                                  <span key={sku.id} style={skuPill(removed ? '#F0EFE8' : '#fff', removed ? '#DDDBD3' : '#C9C8C2', removed ? '#A8A6A0' : '#1A1A1A')}>
                                    <SkuDot name={sku.color_name} hex={sku.color_hex} size={6} />
                                    <span style={{ textDecoration: removed ? 'line-through' : 'none' }}>{sku.color_name}</span>
                                    <button onClick={() => toggleSkuRemove(row.id, sku.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: removed ? '#A8A6A0' : '#9A9A95', display: 'grid', placeItems: 'center', marginLeft: 2 }}>
                                      <Icon.X />
                                    </button>
                                  </span>
                                )
                              })}
                              {e.newNames.map((name, ni) => (
                                <span key={`new-${ni}`} style={skuPill('#FEE9E4', '#FCD6CC', '#E8461A')}>
                                  <SkuDot name={name} size={6} />
                                  {name}
                                  <button onClick={() => setEditMap(m => ({ ...m, [row.id]: { ...m[row.id], newNames: m[row.id].newNames.filter((_, j) => j !== ni) } }))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#E8461A', display: 'grid', placeItems: 'center', marginLeft: 2 }}>
                                    <Icon.X />
                                  </button>
                                </span>
                              ))}
                              <input placeholder="＋ 新增顏色"
                                value={e.addInput}
                                onChange={ev => setEditMap(m => ({ ...m, [row.id]: { ...m[row.id], addInput: ev.target.value } }))}
                                onKeyDown={ev => { if (ev.key === 'Enter') addNewSkuToEdit(row.id) }}
                                style={{ width: 88, fontSize: 11, padding: '3px 8px', border: '0.5px dashed #C9C8C2', borderRadius: 999, fontFamily: 'inherit', outline: 'none', background: '#fff' }} />
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                            <button onClick={() => deletePart(row)} disabled={savingId === row.id}
                              style={{ padding: '5px 10px', borderRadius: 6, border: '0.5px solid #DDDBD3', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#C53A12', fontFamily: 'inherit' }}>
                              刪除
                            </button>
                            <button onClick={() => setExpandedIdx(null)}
                              style={{ padding: '5px 12px', borderRadius: 6, border: '0.5px solid #DDDBD3', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#4A4A4A', fontFamily: 'inherit' }}>
                              取消
                            </button>
                            <button onClick={() => savePart(row)} disabled={savingId === row.id || !e.name.trim()}
                              style={{ padding: '5px 12px', borderRadius: 6, border: '0.5px solid #1A7A3C', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#1A7A3C', fontFamily: 'inherit', fontWeight: 500 }}>
                              {savingId === row.id ? '儲存中...' : '儲存'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}

            {/* New part row */}
            {!edit && (
              <tr>
                <td colSpan={totalCols} style={{ padding: 0 }}>
                  {addingPart ? (
                    <div style={{ ...expandRow, borderTop: '0.5px dashed #DDDBD3' }}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={expandLabel}>零件名稱</div>
                        <input autoFocus value={newPartName} onChange={e => setNewPartName(e.target.value)} placeholder="例：外殼"
                          style={{ ...expandInput, width: 120 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={expandLabel}>SKU 顏色（選填）</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {newPartSkus.map((name, ni) => (
                            <span key={ni} style={skuPill('#FEE9E4', '#FCD6CC', '#E8461A')}>
                              <SkuDot name={name} size={6} />
                              {name}
                              <button onClick={() => setNewPartSkus(s => s.filter((_, j) => j !== ni))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#E8461A', display: 'grid', placeItems: 'center', marginLeft: 2 }}>
                                <Icon.X />
                              </button>
                            </span>
                          ))}
                          <input placeholder="＋ 新增顏色"
                            value={newSkuInput} onChange={e => setNewSkuInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { const n = e.target.value.trim(); if (n) { setNewPartSkus(s => [...s, n]); setNewSkuInput('') } } }}
                            style={{ width: 88, fontSize: 11, padding: '3px 8px', border: '0.5px dashed #C9C8C2', borderRadius: 999, fontFamily: 'inherit', outline: 'none', background: '#fff' }} />
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                        <button onClick={() => { setAddingPart(false); setNewPartName(''); setNewPartSkus([]); setNewSkuInput('') }}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '0.5px solid #DDDBD3', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#4A4A4A', fontFamily: 'inherit' }}>
                          取消
                        </button>
                        <button onClick={saveNewPart} disabled={savingId === 'new' || !newPartName.trim()}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '0.5px solid #1A7A3C', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#1A7A3C', fontFamily: 'inherit', fontWeight: 500 }}>
                          {savingId === 'new' ? '新增中...' : '新增零件'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingPart(true)} style={{
                      width: '100%', background: 'none', border: 'none', padding: '10px 14px',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      borderTop: '0.5px dashed #DDDBD3', color: '#9A9A95', fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'background .1s, color .1s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F8F7F2'; e.currentTarget.style.color = '#4A4A4A' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9A9A95' }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span> 新增零件
                    </button>
                  )}
                </td>
              </tr>
            )}
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
  const qtyColor = isCurrent ? '#E8461A' : '#6B6B6B'
  const rate = st.defectRate
  const rateColor = rate === null ? null : rate > 5 ? '#E8461A' : rate > 2 ? '#B07D00' : '#1A7A3C'
  return (
    <td style={{ width: CELL_W, padding: 0, verticalAlign: 'middle', borderLeft: '0.5px solid #F0EFE8' }}>
      <div style={{ height: CELL_H, padding: '5px 8px', background: bg, opacity: isWait ? 0.3 : 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, position: 'relative' }}>
        <div style={{ fontSize: 9, fontWeight: 500, color: statusColor, display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1 }}>
          {isDone && <span style={{ fontSize: 10 }}>✓</span>}
          {isCurrent && <span style={{ width: 5, height: 5, borderRadius: 999, background: statusColor, display: 'inline-block', flexShrink: 0 }} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.action}</span>
        </div>
        <div className="num" style={{ fontSize: 14, fontWeight: 700, color: qtyColor, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {st.inTransit > 0 ? st.inTransit.toLocaleString() : '—'}
        </div>
        {rate !== null && (
          <div style={{ fontSize: 9, color: rateColor, lineHeight: 1, position: 'absolute', bottom: 4, right: 6 }}>
            {rate.toFixed(1)}%
          </div>
        )}
      </div>
    </td>
  )
}

// ─── Page: Parts Management ───────────────────────────────────
function AddPartModal({ selectedProduct, onClose, onCreated }) {
  const [partName, setPartName] = useState('')
  const [colorInput, setColorInput] = useState('')
  const [stockInput, setStockInput] = useState('')
  const [skus, setSkus] = useState([]) // [{colorName, stock}]
  const [saving, setSaving] = useState(false)

  function addColor() {
    const name = colorInput.trim()
    if (!name) return
    if (skus.find(s => s.colorName === name)) return
    setSkus(prev => [...prev, { colorName: name, stock: Number(stockInput) || 0 }])
    setColorInput(''); setStockInput('')
  }

  async function handleCreate() {
    const name = partName.trim()
    if (!name || !selectedProduct) return
    setSaving(true)
    try {
      const partRes = await apiFetch('/api/parts', { method: 'POST', body: JSON.stringify({ product_id: selectedProduct.id, name }) })
      const { id: partId } = await partRes.json()
      for (const sku of skus) {
        await apiFetch(`/api/parts/${partId}/skus`, { method: 'POST', body: JSON.stringify({ color_name: sku.colorName }) })
        if (sku.stock > 0) {
          await apiFetch('/api/receive-logs', { method: 'POST', body: JSON.stringify({
            product_id: selectedProduct.id, part_id: partId,
            sku_color: sku.colorName, action_type: 'receive',
            qty: sku.stock, defect_qty: 0, note: '初始庫存',
          }) })
        }
      }
      onCreated()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 480, background: '#fff', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>新增零件</div>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6 }}><Icon.X /></button>
        </div>

        {/* Part name */}
        <div className="field">
          <label>零件名稱 *</label>
          <input autoFocus className="input" placeholder="例：外殼" value={partName}
            onChange={e => setPartName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('color-input')?.focus()} />
        </div>

        {/* Add color row */}
        <div className="field">
          <label>顏色 / SKU</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="color-input" className="input" placeholder="顏色名稱，例：鈦" style={{ flex: 2 }}
              value={colorInput} onChange={e => setColorInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addColor()} />
            <input className="input num" placeholder="初始庫存" style={{ flex: 1 }}
              type="number" min="0" value={stockInput}
              onChange={e => setStockInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addColor()} />
            <button className="btn" style={{ flexShrink: 0 }} onClick={addColor}>
              <Icon.Plus />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
            輸入顏色後按 + 加入，可加入多個顏色
          </div>
        </div>

        {/* Added SKUs */}
        {skus.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {skus.map((sku, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-2)', border: '1px solid var(--line-1)',
                borderRadius: 20, padding: '4px 10px 4px 8px', fontSize: 12,
              }}>
                <SkuDot name={sku.colorName} size={10} />
                {sku.colorName}
                {sku.stock > 0 && <span className="num" style={{ color: 'var(--text-3)', fontSize: 11 }}>· {sku.stock}</span>}
                <button onClick={() => setSkus(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-4)', display: 'inline-flex', marginLeft: 2 }}>
                  <Icon.X />
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--line-1)' }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={handleCreate} disabled={saving || !partName.trim()}>
            <Icon.Plus />{saving ? '新增中...' : '新增零件'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function SkuPage({ parts, logs, products, onSelectProduct, selectedProduct, reloadParts, reloadLogs }) {
  const [showAddPart, setShowAddPart] = useState(false)

  async function deletePart(partId, partName) {
    if (!confirm(`確認刪除零件「${partName}」？其所有 SKU 也會一併刪除。`)) return
    await apiFetch(`/api/parts/${partId}`, { method: 'DELETE' })
    reloadParts()
  }

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
        {parts.map((part, i) => (
          <SkuPartRow key={part.id} part={part} logs={logs} isFirst={i === 0}
            onDelete={() => deletePart(part.id, part.name)}
            onReload={reloadParts}
          />
        ))}
        {parts.length === 0 && (
          <div style={{ padding: '40px 24px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
            尚無零件資料，請先新增零件
          </div>
        )}
      </div>

      <button className="btn" style={{ fontSize: 13, alignSelf: 'flex-start' }} onClick={() => setShowAddPart(true)}>
        <Icon.Plus />新增零件
      </button>

      {showAddPart && (
        <AddPartModal
          selectedProduct={selectedProduct}
          onClose={() => setShowAddPart(false)}
          onCreated={() => { reloadParts(); reloadLogs() }}
        />
      )}
    </div>
  )
}

function SkuPartRow({ part, logs, isFirst, onDelete, onReload }) {
  const [open, setOpen] = useState(isFirst)
  const [addingSku, setAddingSku] = useState(false)
  const [newSku, setNewSku] = useState('')

  const skuLogs = (color_name) => logs.filter(l => l.part_id === part.id && l.sku_color === color_name)

  async function createSku() {
    const name = newSku.trim()
    if (!name) return
    await apiFetch(`/api/parts/${part.id}/skus`, { method: 'POST', body: JSON.stringify({ color_name: name }) })
    setNewSku(''); setAddingSku(false); onReload()
  }

  async function deleteSku(skuId, skuName) {
    if (!confirm(`確認刪除 SKU「${skuName}」？`)) return
    await apiFetch(`/api/parts/${part.id}/skus/${skuId}`, { method: 'DELETE' })
    onReload()
  }

  return (
    <div style={{ borderTop: isFirst ? 'none' : '1px solid var(--line-1)' }}>
      {/* Part header */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setOpen(o => !o)} style={{
          flex: 1, border: 'none', background: 'transparent', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: 0,
        }}>
          <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--text-3)', display: 'inline-flex', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2l4 4-4 4"/></svg>
          </span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{part.name}</span>
          <div style={{ display: 'flex', gap: 4 }}>{part.skus?.map(s => <SkuDot key={s.id} name={s.color_name} hex={s.color_hex} />)}</div>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{part.skus?.length || 0} 個 SKU</span>
        </button>
        <button onClick={onDelete} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)',
          padding: 4, borderRadius: 4, display: 'grid', placeItems: 'center', flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--bad)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}>
          <Icon.X />
        </button>
      </div>

      {/* Expanded: SKU table + add SKU */}
      {open && (
        <div style={{ padding: '0 24px 18px' }}>
          {part.skus?.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line-1)' }}>
                  {['SKU', '進貨', '送加工', '回廠', '出貨', '不良', '估計在庫', ''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 0', textAlign: h === 'SKU' || h === '' ? 'left' : 'right', fontSize: 12, fontWeight: 400, color: 'var(--text-3)', width: h === '' ? 28 : 'auto' }}>{h}</th>
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
                          <SkuDot name={sku.color_name} hex={sku.color_hex} />{sku.color_name}
                        </span>
                      </td>
                      {[receive, send, ret, ship, defect].map((v, i) => (
                        <td key={i} className="num" style={{ padding: '10px 0', textAlign: 'right', color: [null, 'var(--accent)', 'var(--ok)', 'var(--info)', 'var(--bad)'][i] || 'inherit' }}>{v || '—'}</td>
                      ))}
                      <td className="num" style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: low ? 'var(--bad)' : 'var(--text-1)' }}>
                        {low && <span style={{ color: 'var(--bad)', marginRight: 4 }}>●</span>}{est}
                      </td>
                      <td style={{ padding: '10px 0 10px 8px', textAlign: 'right' }}>
                        <button onClick={() => deleteSku(sku.id, sku.color_name)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)',
                          padding: 2, borderRadius: 4, display: 'inline-grid', placeItems: 'center',
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--bad)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}>
                          <Icon.X />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Add SKU */}
          {addingSku ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input autoFocus className="input" style={{ flex: 1, fontSize: 13 }} placeholder="顏色名稱，例：鈦"
                value={newSku} onChange={e => setNewSku(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSku(); if (e.key === 'Escape') setAddingSku(false) }} />
              <button className="btn primary" style={{ fontSize: 13 }} onClick={createSku}>新增</button>
              <button className="btn" style={{ fontSize: 13 }} onClick={() => { setAddingSku(false); setNewSku('') }}>取消</button>
            </div>
          ) : (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--info)', padding: 0 }}
              onClick={() => setAddingSku(true)}>
              ＋ 新增顏色
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page: Log entry ──────────────────────────────────────────
// SQLite CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" without timezone — it's UTC but
// browsers parse it as local time. Normalise to UTC before constructing a Date.
function parseTs(raw) {
  if (!raw) return null
  if (typeof raw !== 'string') return new Date(raw)
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return new Date(s.replace(' ', 'T') + 'Z')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) return new Date(s + 'Z')
  return new Date(s)
}

function toDatetimeLocal(raw) {
  const d = raw instanceof Date ? raw : parseTs(raw)
  if (!d || isNaN(d)) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function formatLogTime(raw) {
  if (!raw) return ''
  const d = parseTs(raw)
  if (!d || isNaN(d)) return String(raw).slice(0, 16).replace('T', ' ')
  const now = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const hhmm = `${hh}:${mi}`
  if (d.toDateString() === now.toDateString()) return hhmm
  const yest = new Date(now); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return `昨天 ${hhmm}`
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd} ${hhmm}`
}

function uniqueFactoriesFromStages(stages) {
  const seen = new Set()
  const out = []
  for (const s of stages) {
    if (!seen.has(s.factory_name)) { seen.add(s.factory_name); out.push(s.factory_name) }
  }
  return out
}

function getSourceDisplay(log) {
  switch (log.action_type) {
    case 'receive': return '原料廠'
    case 'ship':    return '大貨出貨'
    case 'scrap':   return '報廢'
    case 'qc':      return '品檢暫存'
    case 'return':
    case 'send':
      return log.stage_name || '—'
    case 'rework':
      if (log.stage_name) return `重工→${log.stage_name.split(' · ')[0]}`
      return '—'
    default: return '—'
  }
}

function WorkerManagerPopup({ workers: initWorkers, onClose, onReload }) {
  const [list, setList] = useState(initWorkers)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const editRef = useRef(null)
  const addRef = useRef(null)

  useEffect(() => { if (editId !== null) editRef.current?.focus() }, [editId])
  useEffect(() => { if (addMode) addRef.current?.focus() }, [addMode])

  function cancelEdit() { setEditId(null); setEditName('') }

  async function saveEdit(id) {
    const name = editName.trim()
    if (!name) { cancelEdit(); return }
    setSaving(true)
    try {
      await apiFetch(`/api/workers/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
      setList(l => l.map(w => w.id === id ? { ...w, name } : w))
      cancelEdit()
    } finally { setSaving(false) }
  }

  async function deleteWorker(id) {
    setSaving(true)
    try {
      await apiFetch(`/api/workers/${id}`, { method: 'DELETE' })
      setList(l => l.filter(w => w.id !== id))
      setDeleteId(null)
    } finally { setSaving(false) }
  }

  async function addWorker() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      const res = await apiFetch('/api/workers', { method: 'POST', body: JSON.stringify({ name }) })
      if (!res.ok) throw new Error('新增失敗')
      const { id } = await res.json()
      setList(l => [...l, { id, name, is_active: 1 }])
      setNewName(''); setAddMode(false)
    } finally { setSaving(false) }
  }

  function handleClose() { onReload(); onClose() }

  return (
    <ModalOverlay onClose={handleClose}>
      <div style={{
        width: 360, background: 'var(--bg-1)', borderRadius: 'var(--r-lg)',
        padding: 16, border: '0.5px solid var(--line-2)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>管理登記人</span>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)', display: 'grid', placeItems: 'center' }}>
            <Icon.X />
          </button>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {list.map(w => (
            <div key={w.id}>
              {deleteId === w.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bad-tint)', borderRadius: 'var(--r-md)', border: '0.5px solid #FCD6CC' }}>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--bad)' }}>確認刪除「{w.name}」？</span>
                  <button onClick={() => deleteWorker(w.id)} disabled={saving} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, border: 'none', background: 'var(--bad)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>確認</button>
                  <button onClick={() => setDeleteId(null)} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--line-2)', background: 'var(--bg-1)', cursor: 'pointer', color: 'var(--text-2)' }}>取消</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, flexShrink: 0, display: 'grid', placeItems: 'center', background: '#E8461A', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                    {w.name.slice(-1)}
                  </div>
                  {editId === w.id ? (
                    <input ref={editRef} className="input" style={{ flex: 1, fontSize: 13, padding: '4px 8px' }}
                      value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(w.id); if (e.key === 'Escape') cancelEdit() }}
                      onBlur={() => saveEdit(w.id)} />
                  ) : (
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{w.name}</span>
                  )}
                  {editId !== w.id && (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => { setEditId(w.id); setEditName(w.name); setDeleteId(null) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)', display: 'grid', placeItems: 'center', borderRadius: 4 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#E8461A'; e.currentTarget.style.background = 'var(--bg-3)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none' }}>
                        <Icon.Edit />
                      </button>
                      <button onClick={() => { setDeleteId(w.id); cancelEdit() }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)', display: 'grid', placeItems: 'center', borderRadius: 4 }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--bad)'; e.currentTarget.style.background = 'var(--bg-3)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none' }}>
                        <Icon.Trash />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--line-1)', margin: '8px 0' }} />

        {/* Add new */}
        {addMode ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input ref={addRef} className="input" style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
              placeholder="輸入姓名" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addWorker(); if (e.key === 'Escape') { setAddMode(false); setNewName('') } }} />
            <button onClick={addWorker} disabled={!newName.trim() || saving} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12, border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 500,
              cursor: saving ? 'wait' : 'pointer', opacity: !newName.trim() ? 0.5 : 1,
            }}>{saving ? '...' : '新增'}</button>
            <button onClick={() => { setAddMode(false); setNewName('') }} style={{
              padding: '6px 10px', borderRadius: 6, fontSize: 12,
              border: '1px solid var(--line-2)', background: 'var(--bg-1)', cursor: 'pointer', color: 'var(--text-2)',
            }}>取消</button>
          </div>
        ) : (
          <button onClick={() => setAddMode(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginBottom: 12,
            padding: '8px 10px', borderRadius: 'var(--r-md)',
            border: '0.5px dashed var(--line-2)', background: 'none',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-3)', fontFamily: 'inherit',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line-2)'}>
            <Icon.Plus />新增登記人
          </button>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleClose} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13,
            border: '1px solid var(--line-2)', background: 'var(--bg-1)',
            cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'inherit',
          }}>完成</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function LogPage({ products, selectedProduct, logs, reload, onLogSubmit }) {
  const [direction, setDirection] = useState('in')
  const [source, setSource] = useState(null)
  const [pid, setPid] = useState(selectedProduct?.id || '')
  const [partName, setPartName] = useState('')
  const [partsData, setPartsData] = useState([])
  const [stages, setStages] = useState([])
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')
  const [defectQty, setDefectQty] = useState('')
  const [note, setNote] = useState('')
  const [handling, setHandling] = useState('none')
  const [reworkStageId, setReworkStageId] = useState(null)
  const [workers, setWorkers] = useState([])
  const [workerId, setWorkerId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editPartsData, setEditPartsData] = useState([])
  const [pendingDefects, setPendingDefects] = useState([])
  const [defectOpen, setDefectOpen] = useState(true)
  const [reworkExpandId, setReworkExpandId] = useState(null)
  const [reworkSelInline, setReworkSelInline] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [batchNoteMode, setBatchNoteMode] = useState(false)
  const [batchNote, setBatchNote] = useState('')
  const [loggedAt, setLoggedAt] = useState(() => toDatetimeLocal(new Date()))
  const [lostQty, setLostQty] = useState('')
  const [workerManagerOpen, setWorkerManagerOpen] = useState(false)
  const [qcPending, setQcPending] = useState([])
  const [qcOpen, setQcOpen] = useState(true)
  const [qcExpandId, setQcExpandId] = useState(null)
  const [qcForm, setQcForm] = useState(null) // { qty, action, reworkStageId }

  const dq = Math.max(0, parseInt(defectQty, 10) || 0)
  const actionType = source ? resolveActionType(direction, source) : null
  const stageId = (actionType && stages.length) ? resolveStageId(stages, source, actionType) : null
  const part = partsData.find(p => p.name === partName)
  const showDefectHandling = direction === 'in' && dq > 0
  const showLostQty = actionType === 'send' || actionType === 'return'
  const reworkStages = stages.filter(s => (s.in_transit || 0) > 0)
  const factories = uniqueFactoriesFromStages(stages)
  const sourceOptions = direction === 'qc'
    ? factories.map(f => ({ value: f, label: f }))
    : direction === 'in'
      ? [{ value: 'raw', label: '原料（倉庫）' }, ...factories.map(f => ({ value: f, label: f }))]
      : [{ value: 'ship', label: '大貨出貨' }, ...factories.map(f => ({ value: f, label: f }))]

  useEffect(() => {
    fetch('/api/workers').then(r => r.json()).then(setWorkers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!pid) return
    apiFetch(`/api/products/${pid}/parts`).then(r => r.json()).then(d => {
      setPartsData(d)
      const first = d[0]
      setPartName(first?.name || '')
      setStages(first?.stages || [])
      setSku(first?.skus?.length === 1 ? (first.skus[0].color_name ?? '') : '')
      setSource(null)
    })
  }, [pid])

  useEffect(() => { if (selectedProduct) setPid(selectedProduct.id) }, [selectedProduct?.id])
  useEffect(() => { setSource(null); setHandling('none'); setReworkStageId(null) }, [direction])
  useEffect(() => { if (dq === 0) { setHandling('none'); setReworkStageId(null) } }, [dq])

  async function loadPendingDefects() {
    if (!pid) return
    const res = await apiFetch(`/api/defect-logs?status=pending&product_id=${pid}`)
    if (res.ok) setPendingDefects(await res.json())
  }
  useEffect(() => { loadPendingDefects() }, [pid])

  async function loadQcPending() {
    if (!pid) return
    const res = await apiFetch(`/api/qc/pending?product_id=${pid}`)
    if (res.ok) setQcPending(await res.json())
  }
  useEffect(() => { loadQcPending() }, [pid])

  async function processQC(qc) {
    if (!qcForm) return
    const n = Math.max(0, parseInt(qcForm.qty, 10) || 0)
    if (n <= 0 || n > qc.qty) return alert('請輸入正確的點貨數量')
    if (qcForm.action === 'rework' && !qcForm.reworkStageId) return alert('請選擇重工站')
    try {
      const res = await apiFetch(`/api/qc/pending/${qc.id}/process`, {
        method: 'POST',
        body: JSON.stringify({
          qty: n, action: qcForm.action,
          rework_stage_id: qcForm.action === 'rework' ? qcForm.reworkStageId : null,
          worker_id: workerId || null,
        }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); return alert(b.error || `送出失敗 (${res.status})`) }
      setQcExpandId(null); setQcForm(null); loadQcPending(); reload(); onLogSubmit?.()
    } catch (e) { alert('送出失敗：' + e.message) }
  }

  async function deleteLog(id) {
    if (!confirm('確認刪除此筆紀錄？庫存數字將一併還原。')) return
    try {
      const res = await apiFetch(`/api/receive-logs/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`) }
      reload(); onLogSubmit?.()
    } catch (e) { alert('刪除失敗：' + e.message) }
  }

  // 「最近紀錄」現在會顯示所有產品的紀錄（見 25dfa75），但編輯卡片裡的零件/
  // 加工站下拉選單需要該筆紀錄所屬產品的零件清單 —— 跟目前分頁開著的產品不一定
  // 相同，所以另外抓一份，不要混用分頁本身的 partsData
  async function startEdit(log) {
    setEditRow({
      id: log.id, action_type: log.action_type, part_id: log.part_id, stage_id: log.stage_id,
      sku_color: log.sku_color || '', qty: String(log.qty), defect_qty: String(log.defect_qty || 0),
      lost_qty: String(log.lost_qty || 0), note: log.note || '', worker_id: log.worker_id ?? '',
      logged_at: toDatetimeLocal(log.logged_at || new Date()),
    })
    if (log.product_id === pid) {
      setEditPartsData(partsData)
      return
    }
    try {
      const res = await apiFetch(`/api/products/${log.product_id}/parts`)
      setEditPartsData(res.ok ? await res.json() : [])
    } catch {
      setEditPartsData([])
    }
  }

  async function saveEdit() {
    if (!editRow) return
    const { id, action_type, part_id, stage_id, sku_color, qty, defect_qty, lost_qty, note, worker_id, logged_at } = editRow
    if (!qty || +qty <= 0) return alert('請輸入正確數量')
    try {
      const res = await apiFetch(`/api/receive-logs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action_type, part_id: part_id || null, stage_id: stage_id || null,
          sku_color: sku_color || '', qty: +qty, defect_qty: Math.max(0, +(defect_qty || 0)),
          lost_qty: Math.max(0, +(lost_qty || 0)),
          note: note || '', worker_id: worker_id ? +worker_id : null,
          logged_at: new Date(logged_at).toISOString(),
        }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); return alert(b.error || `儲存失敗 (${res.status})`) }
      setEditRow(null); reload()
    } catch (e) { alert('儲存失敗：' + e.message) }
  }

  const visibleLogs = logs.slice(0, 50)
  const allVisible = visibleLogs.length > 0 && visibleLogs.every(l => selected.has(l.id))
  const someVisible = visibleLogs.some(l => selected.has(l.id))

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    if (allVisible) setSelected(new Set())
    else setSelected(new Set(visibleLogs.map(l => l.id)))
  }

  async function batchDelete() {
    const ids = [...selected]
    if (!confirm(`確認刪除 ${ids.length} 筆紀錄？庫存數量將自動回滾。`)) return
    let failed = 0
    for (const id of ids) {
      try {
        const res = await apiFetch(`/api/receive-logs/${id}`, { method: 'DELETE' })
        if (!res.ok) failed++
      } catch { failed++ }
    }
    setSelected(new Set()); reload(); onLogSubmit?.()
    if (failed > 0) alert(`${failed} 筆刪除失敗，其餘已完成。`)
  }

  async function batchSetNote() {
    const ids = [...selected]
    for (const id of ids) {
      try { await apiFetch(`/api/receive-logs/${id}`, { method: 'PATCH', body: JSON.stringify({ note: batchNote }) }) } catch {}
    }
    setBatchNoteMode(false); setBatchNote(''); reload()
  }

  function exportCSV() {
    const rows = visibleLogs.filter(l => selected.has(l.id))
    const headers = ['時間', '動作', '登記人', '零件', '來源去向', 'SKU', '數量', '不良品', '遺失', '備註']
    const lines = [
      headers.join(','),
      ...rows.map(l => [
        formatLogTime(l.logged_at) || '',
        ACTION_LABEL[l.action_type] || l.action_type,
        l.worker_name || '',
        l.part_name || '',
        getSourceDisplay(l),
        l.sku_color || '',
        l.qty,
        l.defect_qty || 0,
        l.lost_qty || 0,
        `"${(l.note || '').replace(/"/g, '""')}"`,
      ].join(','))
    ]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `進出貨紀錄_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }

  async function submit() {
    if (!qty || isNaN(+qty) || +qty <= 0) return alert('請輸入正確數量')
    if (!source) return alert('請選擇來源／去向')
    if ((part?.skus?.length ?? 0) > 1 && !sku) return alert('請選擇 SKU 顏色')
    if (showDefectHandling && handling === 'rework' && !reworkStageId) return alert('請選擇重工站')
    setSubmitting(true)
    try {
      const loggedAtISO = new Date(loggedAt).toISOString()

      // 品檢登記不走一般動作流程 —— 先暫存到 qc_pending，等分批點貨才決定
      // 入庫/重工/報廢，所以不檢查不良品/重工站，直接送出後就結束
      if (actionType === 'qc') {
        await apiFetch('/api/qc/pending', {
          method: 'POST',
          body: JSON.stringify({
            product_id: pid, part_id: part?.id, stage_id: stageId,
            sku_color: sku || '', qty: +qty, note, worker_id: workerId || null,
            logged_at: loggedAtISO,
          }),
        })
        setQty(''); setNote(''); setLoggedAt(toDatetimeLocal(new Date()))
        reload(); loadQcPending(); onLogSubmit?.()
        apiFetch(`/api/products/${pid}/parts`).then(r => r.json()).then(d => {
          setPartsData(d)
          const curPart = d.find(p => p.name === partName)
          if (curPart) setStages(curPart.stages || [])
        }).catch(() => {})
        return
      }

      await apiFetch('/api/receive-logs', {
        method: 'POST',
        body: JSON.stringify({
          product_id: pid, part_id: part?.id, stage_id: stageId,
          sku_color: sku || '', action_type: actionType,
          qty: +qty, defect_qty: dq,
          lost_qty: showLostQty ? Math.max(0, parseInt(lostQty, 10) || 0) : 0,
          note, worker_id: workerId || null,
          logged_at: loggedAtISO,
        }),
      })
      if (showDefectHandling && handling === 'rework' && dq > 0 && reworkStageId) {
        await apiFetch('/api/receive-logs', {
          method: 'POST',
          body: JSON.stringify({
            product_id: pid, part_id: part?.id, stage_id: reworkStageId,
            sku_color: sku || '', action_type: 'rework',
            qty: dq, defect_qty: 0, note: '（自動重工）', worker_id: workerId || null,
            logged_at: loggedAtISO,
          }),
        })
      }
      if (showDefectHandling && handling === 'scrap' && dq > 0) {
        await apiFetch('/api/receive-logs', {
          method: 'POST',
          body: JSON.stringify({
            product_id: pid, part_id: part?.id, stage_id: null,
            sku_color: sku || '', action_type: 'scrap',
            qty: dq, defect_qty: 0, note: '（自動報廢）', worker_id: workerId || null,
            logged_at: loggedAtISO,
          }),
        })
      }
      setQty(''); setDefectQty(''); setLostQty(''); setNote(''); setHandling('none'); setReworkStageId(null)
      setLoggedAt(toDatetimeLocal(new Date()))
      reload(); loadPendingDefects(); onLogSubmit?.()
      // Refresh parts/stages so resolveStageId has up-to-date in_transit values
      apiFetch(`/api/products/${pid}/parts`).then(r => r.json()).then(d => {
        setPartsData(d)
        const curPart = d.find(p => p.name === partName)
        if (curPart) setStages(curPart.stages || [])
      }).catch(() => {})
    } catch (e) { alert('送出失敗：' + e.message) }
    finally { setSubmitting(false) }
  }

  async function handleDefectRework(defect, rStageId) {
    try {
      await apiFetch('/api/receive-logs', {
        method: 'POST',
        body: JSON.stringify({
          product_id: defect.product_id, part_id: defect.part_id, stage_id: rStageId,
          sku_color: defect.sku_color || '', action_type: 'rework',
          qty: defect.qty, defect_qty: 0, note: '', worker_id: null,
        }),
      })
      setReworkExpandId(null); setReworkSelInline(null); loadPendingDefects(); reload(); onLogSubmit?.()
    } catch (e) { alert('送出失敗：' + e.message) }
  }

  async function handleDefectScrap(defect) {
    if (!confirm(`確認報廢 ${defect.qty} 件？此動作無法還原。`)) return
    try {
      await apiFetch('/api/receive-logs', {
        method: 'POST',
        body: JSON.stringify({
          product_id: defect.product_id, part_id: defect.part_id, stage_id: null,
          sku_color: defect.sku_color || '', action_type: 'scrap',
          qty: defect.qty, defect_qty: 0, note: '', worker_id: null,
        }),
      })
      loadPendingDefects(); reload(); onLogSubmit?.()
    } catch (e) { alert('送出失敗：' + e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Pending defects banner */}
      {pendingDefects.length > 0 && (
        <div style={{
          background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 'var(--border-radius-lg, 12px)',
          padding: '12px 16px',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon.AlertTriangle size={16} color="#B07D00" />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#633806' }}>待處理不良品</span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#E8461A',
                background: 'rgba(232,70,26,0.1)', padding: '1px 8px', borderRadius: 10,
              }}>{pendingDefects.length} 筆</span>
            </div>
            <button onClick={() => setDefectOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: '#B07D00', display: 'flex', alignItems: 'center',
            }}>
              {defectOpen ? <Icon.ChevronUp size={16} color="#B07D00" /> : <Icon.ChevronDown size={16} color="#B07D00" />}
            </button>
          </div>

          {/* Expandable list */}
          {defectOpen && (
            <div style={{ marginTop: 10 }}>
              {pendingDefects.map((d, i) => {
                const isLast = i === pendingDefects.length - 1
                const isExpanding = reworkExpandId === d.id
                const defectPart = partsData.find(p => p.id === d.part_id)
                const availStages = (defectPart?.stages || []).filter(s => (s.in_transit || 0) > 0)
                return (
                  <div key={d.id} style={{ borderBottom: isLast && !isExpanding ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#8A6000', minWidth: 72 }}>{formatLogTime(d.created_at)}</span>
                      <span style={{ fontSize: 13, color: '#633806', fontWeight: 500 }}>{d.part_name || '—'}</span>
                      <span style={{ fontSize: 12, color: '#8A6000' }}>{d.stage_name || '—'}</span>
                      {d.sku_color && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#8A6000' }}>
                          <SkuDot name={d.sku_color} />{d.sku_color}
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#E8461A', marginLeft: 'auto' }}>{d.qty} 件</span>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => { setReworkExpandId(isExpanding ? null : d.id); setReworkSelInline(null) }} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          border: `1px solid ${isExpanding ? 'var(--accent)' : '#F0A040'}`,
                          background: isExpanding ? 'var(--accent-tint)' : 'rgba(240,160,64,0.08)',
                          color: isExpanding ? 'var(--accent)' : '#B07D00', fontWeight: 500,
                        }}>送重工</button>
                        <button onClick={() => handleDefectScrap(d)} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.06)', color: '#DC2626',
                        }}>報廢</button>
                      </div>
                    </div>
                    {/* Inline rework stage picker */}
                    {isExpanding && (
                      <div style={{ padding: '10px 0 12px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        {availStages.length === 0
                          ? <span style={{ fontSize: 12, color: '#8A6000' }}>目前無加工中零件可重工</span>
                          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                              {availStages.map(s => (
                                <button key={s.id} onClick={() => setReworkSelInline(s.id)} style={{
                                  padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                                  border: `1.5px solid ${reworkSelInline === s.id ? 'var(--accent)' : '#F0A040'}`,
                                  background: reworkSelInline === s.id ? 'var(--accent-tint)' : 'rgba(240,160,64,0.08)',
                                  color: reworkSelInline === s.id ? 'var(--accent)' : '#B07D00',
                                }}>
                                  {s.factory_name} · {s.action_name}
                                  <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({s.in_transit})</span>
                                </button>
                              ))}
                              {reworkSelInline && (
                                <button onClick={() => handleDefectRework(d, reworkSelInline)} style={{
                                  padding: '5px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                                  border: 'none', background: 'var(--accent)', color: '#fff',
                                }}>確認重工</button>
                              )}
                            </div>
                        }
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pending QC banner */}
      {qcPending.length > 0 && (
        <div style={{
          background: '#EEF5FC', border: '0.5px solid #185FA5', borderRadius: 'var(--border-radius-lg, 12px)',
          padding: '12px 16px',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon.AlertTriangle size={16} color="#185FA5" />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#0F3D6E' }}>待點貨品檢</span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: '#185FA5',
                background: 'rgba(24,95,165,0.1)', padding: '1px 8px', borderRadius: 10,
              }}>{qcPending.length} 筆</span>
            </div>
            <button onClick={() => setQcOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: '#185FA5', display: 'flex', alignItems: 'center',
            }}>
              {qcOpen ? <Icon.ChevronUp size={16} color="#185FA5" /> : <Icon.ChevronDown size={16} color="#185FA5" />}
            </button>
          </div>

          {/* Expandable list */}
          {qcOpen && (
            <div style={{ marginTop: 10 }}>
              {qcPending.map((q, i) => {
                const isLast = i === qcPending.length - 1
                const isExpanding = qcExpandId === q.id
                const qcPart = partsData.find(p => p.id === q.part_id)
                const qcStages = qcPart?.stages || []
                return (
                  <div key={q.id} style={{ borderBottom: isLast && !isExpanding ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#3A6694', minWidth: 72 }}>{formatLogTime(q.created_at)}</span>
                      <span style={{ fontSize: 13, color: '#0F3D6E', fontWeight: 500 }}>{q.part_name || '—'}</span>
                      <span style={{ fontSize: 12, color: '#3A6694' }}>{q.stage_name || '—'}</span>
                      {q.sku_color && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3A6694' }}>
                          <SkuDot name={q.sku_color} />{q.sku_color}
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#185FA5', marginLeft: 'auto' }}>{q.qty} 件</span>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => {
                          setQcExpandId(isExpanding ? null : q.id)
                          setQcForm(isExpanding ? null : { qty: String(q.qty), action: 'stock', reworkStageId: null })
                        }} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                          border: `1px solid ${isExpanding ? '#185FA5' : '#9CC2E8'}`,
                          background: isExpanding ? '#DCEAFA' : 'rgba(24,95,165,0.08)',
                          color: '#185FA5', fontWeight: 500,
                        }}>點貨</button>
                      </div>
                    </div>
                    {/* Inline 點貨表單 */}
                    {isExpanding && qcForm && (
                      <div style={{ padding: '10px 0 12px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#3A6694' }}>本次點貨數量</span>
                          <input type="number" min="1" max={q.qty} value={qcForm.qty}
                            onChange={e => setQcForm(f => ({ ...f, qty: e.target.value }))}
                            style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #9CC2E8', fontSize: 13 }} />
                          <span style={{ fontSize: 12, color: '#3A6694' }}>/ {q.qty} 件</span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {[
                            { key: 'stock',   label: '✓ 入庫',   color: '#1A7A3C', tint: '#E8F5E9' },
                            { key: 'rework',  label: '送重工',   color: '#B07D00', tint: '#FEF3CD' },
                            { key: 'scrap',   label: '報廢',     color: '#DC2626', tint: '#FCEBEB' },
                            { key: 'pending', label: '繼續待點', color: '#666',    tint: '#F0EFE8' },
                          ].map(o => (
                            <button key={o.key} onClick={() => setQcForm(f => ({ ...f, action: o.key, reworkStageId: o.key === 'rework' ? f.reworkStageId : null }))} style={{
                              padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                              border: `1.5px solid ${qcForm.action === o.key ? o.color : 'var(--line-2)'}`,
                              background: qcForm.action === o.key ? o.tint : '#fff',
                              color: qcForm.action === o.key ? o.color : 'var(--text-2)',
                            }}>{o.label}</button>
                          ))}
                        </div>

                        {qcForm.action === 'rework' && (
                          qcStages.length === 0
                            ? <span style={{ fontSize: 12, color: '#3A6694' }}>此零件尚未設定加工站</span>
                            : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {qcStages.map(s => (
                                  <button key={s.id} onClick={() => setQcForm(f => ({ ...f, reworkStageId: s.id }))} style={{
                                    padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                                    border: `1.5px solid ${qcForm.reworkStageId === s.id ? '#B07D00' : '#F0D9A0'}`,
                                    background: qcForm.reworkStageId === s.id ? '#FEF3CD' : 'rgba(240,160,64,0.08)',
                                    color: qcForm.reworkStageId === s.id ? '#7A5A00' : '#B07D00',
                                  }}>
                                    {s.factory_name} · {s.action_name}
                                    {(s.in_transit || 0) > 0 && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({s.in_transit})</span>}
                                  </button>
                                ))}
                              </div>
                            )
                        )}

                        <div>
                          <button onClick={() => processQC(q)} style={{
                            padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: 'none', background: '#185FA5', color: '#fff',
                          }}>確認登記</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Form */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>新增登記</h3>

          {/* Direction */}
          <div className="field">
            <label>方向</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { key: 'in',  label: '進貨',   color: '#2E7D32', tint: '#E8F5E9' },
                { key: 'out', label: '出貨',   color: '#E64A19', tint: '#FBE9E7' },
                { key: 'qc',  label: '品檢登記', color: '#185FA5', tint: '#E6F0FB' },
              ].map(d => (
                <button key={d.key} onClick={() => setDirection(d.key)} style={{
                  padding: '14px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 600,
                  border: `1.5px solid ${direction === d.key ? d.color : 'var(--line-2)'}`,
                  background: direction === d.key ? d.tint : 'var(--bg-1)',
                  color: direction === d.key ? d.color : 'var(--text-2)',
                }}>{d.label}</button>
              ))}
            </div>
          </div>

          {/* Source / destination */}
          <div className="field">
            <label>{direction === 'out' ? '去向' : '來源'}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sourceOptions.map(opt => (
                <button key={opt.value} onClick={() => setSource(opt.value)} style={{
                  padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                  border: `1px solid ${source === opt.value ? 'var(--accent)' : 'var(--line-2)'}`,
                  background: source === opt.value ? 'var(--accent-tint)' : 'var(--bg-1)',
                  color: source === opt.value ? 'var(--accent)' : 'var(--text-2)',
                }}>{opt.label}</button>
              ))}
            </div>
            {actionType && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                → {ACTION_LABEL[actionType]}
              </div>
            )}
          </div>

          {/* Product */}
          <div className="field">
            <label>產品</label>
            <select className="select" value={pid} onChange={e => setPid(e.target.value)}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Part */}
          <div className="field">
            <label>零件</label>
            <select className="select" value={partName} onChange={e => {
              const name = e.target.value
              setPartName(name)
              const p = partsData.find(x => x.name === name)
              setStages(p?.stages || [])
              setSku(p?.skus?.length === 1 ? (p.skus[0].color_name ?? '') : '')
              setSource(null)
            }}>
              {partsData.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* SKU */}
          {part?.skus?.length > 1 && (
            <div className="field">
              <label style={{ color: sku ? undefined : 'var(--bad)' }}>SKU 顏色 *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {part.skus.map(s => (
                  <button key={s.id} onClick={() => setSku(s.color_name)} style={{
                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                    border: `1px solid ${sku === s.color_name ? 'var(--accent)' : 'var(--line-2)'}`,
                    background: sku === s.color_name ? 'var(--accent-tint)' : 'var(--bg-1)',
                    color: sku === s.color_name ? 'var(--accent)' : 'var(--text-2)',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <SkuDot name={s.color_name} hex={s.color_hex} />{s.color_name}
                  </button>
                ))}
              </div>
              {!sku && <div style={{ fontSize: 11, color: 'var(--bad)', marginTop: 4 }}>請選擇顏色才能送出</div>}
            </div>
          )}

          {/* Worker */}
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ margin: 0 }}>登記人</label>
              <button onClick={() => setWorkerManagerOpen(true)} style={{
                fontSize: 11, color: 'var(--text-3)',
                border: '0.5px solid var(--line-2)', borderRadius: 'var(--r-md)',
                padding: '4px 9px', background: 'var(--bg-1)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#E8461A'; e.currentTarget.style.borderColor = '#E8461A' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}>
                管理
              </button>
            </div>
            <select className="select" value={workerId ?? ''} onChange={e => setWorkerId(e.target.value ? +e.target.value : null)}
              style={{ padding: '10px 12px', fontSize: 13, width: '100%' }}>
              <option value="">（選填）</option>
              {workers.filter(w => w.is_active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {workerManagerOpen && (
              <WorkerManagerPopup
                workers={workers.filter(w => w.is_active)}
                onClose={() => setWorkerManagerOpen(false)}
                onReload={() => fetch('/api/workers').then(r => r.json()).then(setWorkers).catch(() => {})}
              />
            )}
          </div>

          {/* Logged at */}
          <div className="field">
            <label>登記時間</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" type="datetime-local" value={loggedAt} onChange={e => setLoggedAt(e.target.value)}
                style={{ flex: 1 }} />
              <button onClick={() => setLoggedAt(toDatetimeLocal(new Date()))} style={{
                padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                border: '1px solid var(--line-2)', background: 'var(--bg-1)', color: 'var(--text-3)',
              }}>現在</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>預設為當前時間，如需補登過去的紀錄可手動調整</div>
          </div>

          {/* Qty */}
          <div style={{ display: 'grid', gridTemplateColumns: showLostQty ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>數量</label>
              <input className="input num" type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>不良品數量</label>
              <input className="input num" type="number" value={defectQty} onChange={e => setDefectQty(e.target.value)} placeholder="0" />
            </div>
            {showLostQty && (
              <div className="field">
                <label style={{ color: 'var(--text-3)' }}>遺失數量</label>
                <input className="input num" type="number" min={0} value={lostQty} onChange={e => setLostQty(e.target.value)} placeholder="0" />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>運送途中遺失或短缺的數量</div>
              </div>
            )}
          </div>

          {/* Defect handling */}
          {showDefectHandling && (
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bad-tint)', border: '1px solid #FCD6CC' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--bad)', marginBottom: 10 }}>
                不良品 {dq} 件 — 如何處理？
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'none',   label: '暫不處理' },
                  { key: 'rework', label: '送重工' },
                  { key: 'scrap',  label: '報廢' },
                ].map(h => (
                  <button key={h.key} onClick={() => { setHandling(h.key); setReworkStageId(null) }} style={{
                    padding: '5px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${handling === h.key ? 'var(--bad)' : '#FCD6CC'}`,
                    background: handling === h.key ? 'var(--bad)' : '#fff',
                    color: handling === h.key ? '#fff' : 'var(--text-2)',
                    fontWeight: handling === h.key ? 600 : 400,
                  }}>{h.label}</button>
                ))}
              </div>
              {handling === 'rework' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>選擇重工站</div>
                  {reworkStages.length === 0
                    ? <span style={{ fontSize: 12, color: 'var(--text-3)' }}>目前無加工中零件可重工</span>
                    : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {reworkStages.map(s => (
                          <button key={s.id} onClick={() => setReworkStageId(s.id)} style={{
                            padding: '5px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                            border: `1px solid ${reworkStageId === s.id ? 'var(--accent)' : 'var(--line-2)'}`,
                            background: reworkStageId === s.id ? 'var(--accent-tint)' : '#fff',
                            color: reworkStageId === s.id ? 'var(--accent)' : 'var(--text-2)',
                          }}>
                            {s.factory_name} · {s.action_name}
                            <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>({s.in_transit})</span>
                          </button>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="field">
            <label>備註</label>
            <input className="input" placeholder="（選填）" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button className="btn primary" onClick={submit} disabled={submitting}
            style={{ width: '100%', padding: 14, justifyContent: 'center', fontSize: 15 }}>
            {submitting ? '送出中...' : '確認送出'}
          </button>
        </div>

        {/* Log table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}>
            {someVisible ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 500 }}>已選 {selected.size} 筆</span>
                {batchNoteMode ? (
                  <>
                    <input autoFocus value={batchNote} onChange={e => setBatchNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') batchSetNote(); if (e.key === 'Escape') setBatchNoteMode(false) }}
                      placeholder="統一備註內容…" style={{ fontSize: 13, padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: 6, outline: 'none', width: 200 }} />
                    <button onClick={batchSetNote} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>套用</button>
                    <button onClick={() => setBatchNoteMode(false)} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, background: 'none', border: '1px solid var(--line-2)', cursor: 'pointer', color: 'var(--text-2)' }}>取消</button>
                  </>
                ) : (
                  <>
                    <button onClick={batchDelete} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'var(--bad-tint)', color: 'var(--bad)', border: '1px solid #FCD6CC', cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon.Trash />刪除
                    </button>
                    <button onClick={() => { setBatchNoteMode(true); setBatchNote('') }} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--line-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon.Edit />編輯備註
                    </button>
                    <button onClick={exportCSV} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--line-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon.Export />匯出 CSV
                    </button>
                    <button onClick={() => setSelected(new Set())} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>取消選取</button>
                  </>
                )}
              </>
            ) : (
              <>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, flex: 1 }}>最近紀錄</h3>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{logs.length} 筆</span>
              </>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)' }}>
                  <th style={{ padding: '10px 10px 10px 16px', borderBottom: '1px solid var(--line-1)', width: 32 }}>
                    <input type="checkbox" checked={allVisible} ref={el => { if (el) el.indeterminate = someVisible && !allVisible }}
                      onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  </th>
                  {['時間', '動作', '登記人', '產品', '零件', '來源去向', 'SKU', '數量', '不良', '遺失', '備註', ''].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 400, color: 'var(--text-3)', borderBottom: '1px solid var(--line-1)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && <tr><td colSpan={13} style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>尚無紀錄</td></tr>}
                {visibleLogs.map(log => {
                  const isEditing = editRow?.id === log.id
                  const isSel = selected.has(log.id)
                  const ei = editRow // alias for brevity when isEditing

                  if (isEditing) {
                    const IS = { border: '0.5px solid #E8461A', borderRadius: 4, padding: '3px 6px', fontSize: 12, background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }
                    const editPart = editPartsData.find(p => p.id === ei.part_id)
                    const editStages = editPart?.stages || []
                    const editSkus = editPart?.skus || []
                    const stageNeeded = ['return', 'send', 'rework'].includes(ei.action_type)
                    const defectEnabled = ['receive', 'return'].includes(ei.action_type)
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--line-1)', background: '#FEF6F4' }}>
                        <td style={{ padding: '8px 10px 8px 16px' }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(log.id)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }} />
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 150 }}>
                          <input type="datetime-local" value={ei.logged_at}
                            onChange={e => setEditRow(r => ({ ...r, logged_at: e.target.value }))}
                            style={IS} />
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 120 }}>
                          <select value={ei.action_type} style={IS}
                            onChange={e => setEditRow(r => ({ ...r, action_type: e.target.value, stage_id: ['return','send','rework'].includes(e.target.value) ? r.stage_id : null }))}>
                            {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 90 }}>
                          <select value={ei.worker_id ?? ''} style={IS}
                            onChange={e => setEditRow(r => ({ ...r, worker_id: e.target.value || null }))}>
                            <option value="">—</option>
                            {workers.filter(w => w.is_active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: 12 }}>{log.product_name || '—'}</td>
                        <td style={{ padding: '6px 8px', minWidth: 100 }}>
                          <select value={ei.part_id || ''} style={IS}
                            onChange={e => {
                              const pid2 = e.target.value
                              const p = editPartsData.find(x => x.id === pid2)
                              setEditRow(r => ({ ...r, part_id: pid2, stage_id: null, sku_color: p?.skus?.[0]?.color_name || '' }))
                            }}>
                            <option value="">—</option>
                            {editPartsData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 130 }}>
                          {stageNeeded
                            ? <select value={ei.stage_id ?? ''} style={IS}
                                onChange={e => setEditRow(r => ({ ...r, stage_id: e.target.value ? +e.target.value : null }))}>
                                <option value="">（無）</option>
                                {editStages.map(s => <option key={s.id} value={s.id}>{s.factory_name} · {s.action_name}</option>)}
                              </select>
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 90 }}>
                          {editSkus.length > 1
                            ? <select value={ei.sku_color || ''} style={IS}
                                onChange={e => setEditRow(r => ({ ...r, sku_color: e.target.value }))}>
                                <option value="">—</option>
                                {editSkus.map(s => <option key={s.id} value={s.color_name}>{s.color_name}</option>)}
                              </select>
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{ei.sku_color || '—'}</span>
                          }
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 60 }}>
                          <input type="number" min="1" value={ei.qty} style={{ ...IS, width: 60 }}
                            onChange={e => setEditRow(r => ({ ...r, qty: e.target.value }))} />
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 60 }}>
                          <input type="number" min="0" value={ei.defect_qty} disabled={!defectEnabled}
                            style={{ ...IS, width: 60, opacity: defectEnabled ? 1 : 0.4 }}
                            onChange={e => setEditRow(r => ({ ...r, defect_qty: e.target.value }))} />
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 60 }}>
                          {(() => { const lostEnabled = ['send','return'].includes(ei.action_type); return (
                            <input type="number" min="0" value={ei.lost_qty || '0'} disabled={!lostEnabled}
                              style={{ ...IS, width: 60, opacity: lostEnabled ? 1 : 0.4 }}
                              onChange={e => setEditRow(r => ({ ...r, lost_qty: e.target.value }))} />
                          )})()}
                        </td>
                        <td style={{ padding: '6px 8px', minWidth: 100 }}>
                          <input value={ei.note} placeholder="備註" style={IS}
                            onChange={e => setEditRow(r => ({ ...r, note: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Escape') setEditRow(null) }} />
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={saveEdit} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>存</button>
                            <button onClick={() => setEditRow(null)} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--line-2)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)' }}>取消</button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--line-1)', background: isSel ? 'var(--accent-tint)' : undefined }}>
                      <td style={{ padding: '10px 10px 10px 16px' }}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleSelect(log.id)}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }} />
                      </td>
                      <td className="num" style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatLogTime(log.logged_at)}</td>
                      <td style={{ padding: '12px 14px' }}><ActionTag type={log.action_type} /></td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: 12 }}>{log.worker_name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: 12 }}>{log.product_name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{log.part_name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{getSourceDisplay(log)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {log.sku_color && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><SkuDot name={log.sku_color} />{log.sku_color}</span>}
                      </td>
                      <td className="num" style={{ padding: '12px 14px', fontWeight: 500 }}>{log.qty}</td>
                      <td className="num" style={{ padding: '12px 14px', color: 'var(--bad)' }}>{log.defect_qty || '—'}</td>
                      <td className="num" style={{ padding: '12px 14px', color: '#6A1B9A' }}>{log.lost_qty > 0 ? log.lost_qty : '—'}</td>
                      <td style={{ padding: '8px 14px', minWidth: 100 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{log.note || ''}</span>
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button title="編輯"
                            onClick={() => startEdit(log)}
                            style={{ padding: '4px 6px', borderRadius: 5, border: '1px solid var(--line-2)', background: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'grid', placeItems: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-1)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)' }}>
                            <Icon.Edit />
                          </button>
                          <button title="刪除紀錄" onClick={() => deleteLog(log.id)}
                            style={{ padding: '4px 6px', borderRadius: 5, border: '1px solid var(--line-2)', background: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'grid', placeItems: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#FEE9E4'; e.currentTarget.style.color = '#E8461A'; e.currentTarget.style.borderColor = '#FCD6CC' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}>
                            <Icon.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}


// ─── Page: Packaging ─────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 60) return '剛剛'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}

function StockAdjustModal({ product, onClose, onReload }) {
  const current = product.warehouse_total || 0
  const [newQty, setNewQty] = useState(String(current))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const QUICK = ['盤點後修正', '輸入錯誤更正', '系統資料同步', '其他']
  const numQty = Math.max(0, parseInt(newQty) || 0)
  const diff = numQty - current

  const [error, setError] = useState('')

  async function submit() {
    if (!reason.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch('/api/stock-adjustments', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id, new_qty: numQty, reason: reason.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `伺服器錯誤 (${res.status})`)
        return
      }
      onReload(); onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--bg-1)', borderRadius: 'var(--r-lg)', padding: 18,
        width: 400, border: '0.5px solid var(--line-1)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>手動修正庫存</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{product.name}・倉庫庫存</div>
          </div>
          <button className="btn ghost" style={{ padding: '4px 8px', marginTop: -2 }} onClick={onClose}><Icon.X /></button>
        </div>

        {/* Current value block */}
        <div style={{
          background: 'var(--bg-2)', borderRadius: 'var(--r-md)', padding: '10px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>系統計算值</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 500 }}>{current} 件</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>最後更新</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{timeAgo(product.last_receive_at)}</div>
          </div>
        </div>

        {/* New qty */}
        <div className="field">
          <label>修正後數量</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min="0" className="input num"
              style={{ fontSize: 16, padding: '8px 12px', flex: 1 }}
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && reason.trim() && submit()}
            />
            <span style={{ fontSize: 13, color: 'var(--text-3)', flexShrink: 0 }}>件</span>
            {diff !== 0 && (
              <span style={{
                fontSize: 13, fontWeight: 600, flexShrink: 0,
                color: diff > 0 ? 'var(--ok)' : 'var(--bad)',
              }}>
                {diff > 0 ? `+${diff}` : diff} 件
              </span>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="field">
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            修正原因
            <span style={{ fontSize: 10, color: 'var(--bad)', fontWeight: 500 }}>必填</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => setReason(q)} style={{
                padding: '4px 12px', borderRadius: 999, font: 'inherit', fontSize: 12, cursor: 'pointer',
                background: reason === q ? 'var(--text-1)' : 'var(--bg-2)',
                color: reason === q ? 'var(--bg-1)' : 'var(--text-2)',
                border: `1px solid ${reason === q ? 'var(--text-1)' : 'var(--line-2)'}`,
                transition: 'background .1s, color .1s',
              }}>{q}</button>
            ))}
          </div>
          <input className="input" placeholder="或自行輸入原因…"
            value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: 'var(--bad)', background: '#FEE9E4', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={submit}
            disabled={saving || !reason.trim()}>
            {saving ? '儲存中…' : '確認修正'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Part config components ────────────────────────────────────

const PRESET_COLORS = [
  { hex: '#444441', name: '深灰' },
  { hex: '#B4B2A9', name: '淺灰' },
  { hex: '#D85A30', name: '橘' },
  { hex: '#378ADD', name: '藍' },
  { hex: '#1A1A1A', name: '黑' },
  { hex: '#1A7A3C', name: '綠' },
  { hex: '#E8461A', name: '橘紅' },
  { hex: '#B07D00', name: '黃' },
]

function PartConfigRow({ part, onChange, onDelete, autoFocus }) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pendingColor, setPendingColor] = useState({ hex: PRESET_COLORS[0].hex, name: '' })

  function addSku() {
    if (!pendingColor.name.trim()) return
    onChange({ ...part, skus: [...part.skus, { hex: pendingColor.hex, name: pendingColor.name.trim() }] })
    setPendingColor({ hex: PRESET_COLORS[0].hex, name: '' })
    setShowColorPicker(false)
  }

  function removeSku(i) {
    onChange({ ...part, skus: part.skus.filter((_, idx) => idx !== i) })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', background: 'var(--bg-2)',
      borderRadius: 'var(--r-md)', marginBottom: 6,
    }}>
      {/* 零件名稱 */}
      <input
        autoFocus={autoFocus}
        className="input"
        placeholder="零件名稱，例如：L夾"
        value={part.name}
        onChange={e => onChange({ ...part, name: e.target.value })}
        style={{ width: 140, fontSize: 13, padding: '7px 10px', flexShrink: 0 }}
      />

      {/* SKU 區 */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, minWidth: 0, position: 'relative' }}>
        {part.skus.map((sku, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'var(--bg-1)', border: '0.5px solid var(--line-2)',
            borderRadius: 999, padding: '3px 8px 3px 6px', fontSize: 11,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sku.hex, flexShrink: 0, border: '0.5px solid rgba(0,0,0,.12)' }} />
            {sku.name}
            <button onClick={() => removeSku(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, lineHeight: 1, marginLeft: 1, fontSize: 12 }}>×</button>
          </span>
        ))}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowColorPicker(v => !v)}
            style={{
              fontSize: 11, color: 'var(--text-3)', background: 'none',
              border: '0.5px dashed var(--line-2)', borderRadius: 999,
              padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >+ 新增顏色</button>

          {showColorPicker && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 50,
              background: 'var(--bg-1)', border: '0.5px solid var(--line-2)',
              borderRadius: 'var(--r-md)', padding: 12, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
              width: 220,
            }}
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Preset swatches */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c.hex} onClick={() => setPendingColor(p => ({ ...p, hex: c.hex, name: p.name || c.name }))}
                    title={c.name}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', background: c.hex,
                      border: pendingColor.hex === c.hex ? '2px solid var(--text-1)' : '1.5px solid transparent',
                      cursor: 'pointer', padding: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }}
                  />
                ))}
              </div>
              {/* Name input */}
              <input
                autoFocus
                className="input"
                placeholder="顏色名稱"
                value={pendingColor.name}
                onChange={e => setPendingColor(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addSku()}
                style={{ fontSize: 12, padding: '6px 9px', marginBottom: 8, width: '100%', boxSizing: 'border-box' }}
              />
              <button className="btn primary" onClick={addSku} disabled={!pendingColor.name.trim()}
                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                確認
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 刪除整列 */}
      <button onClick={onDelete}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: '4px', flexShrink: 0, lineHeight: 1 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--bad)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
      ><Icon.X /></button>
    </div>
  )
}

function PartsStep({ productName, parts, setParts }) {
  function addPart() {
    setParts(ps => [...ps, { _key: Date.now(), name: '', skus: [] }])
  }
  function updatePart(i, val) { setParts(ps => ps.map((p, idx) => idx === i ? val : p)) }
  function deletePart(i) { setParts(ps => ps.filter((_, idx) => idx !== i)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>設定「{productName}」的零件</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>至少新增一個零件才能開始追蹤加工流程</div>
      </div>
      <div>
        {parts.map((part, i) => (
          <PartConfigRow
            key={part._key}
            part={part}
            onChange={val => updatePart(i, val)}
            onDelete={() => deletePart(i)}
            autoFocus={i === parts.length - 1}
          />
        ))}
      </div>
      <button
        onClick={addPart}
        style={{
          alignSelf: 'flex-start', fontSize: 12, color: 'var(--accent)',
          background: 'none', border: '0.5px dashed var(--accent)',
          borderRadius: 'var(--r-sm)', padding: '5px 12px', cursor: 'pointer',
          marginTop: 2,
        }}
      >+ 新增零件</button>
    </div>
  )
}

async function savePartsToProduct(productId, parts) {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part.name.trim()) continue
    const r = await apiFetch('/api/parts', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, name: part.name.trim(), sort_order: i }),
    })
    const { id: partId } = await r.json()
    for (const sku of part.skus) {
      await apiFetch(`/api/parts/${partId}/skus`, {
        method: 'POST',
        body: JSON.stringify({ color_name: sku.name, color_hex: sku.hex }),
      })
    }
  }
}

function NewProductModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [info, setInfo] = useState({ name: '', description: '' })
  const [parts, setParts] = useState([{ _key: Date.now(), name: '', skus: [] }])
  const [saving, setSaving] = useState(false)

  async function finish() {
    const hasValidPart = parts.some(p => p.name.trim())
    if (!hasValidPart) return
    setSaving(true)
    try {
      const r = await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: info.name.trim(), description: info.description.trim() }),
      })
      const { id } = await r.json()
      await savePartsToProduct(id, parts)
      onCreated()
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 520, background: 'var(--bg-1)', borderRadius: 'var(--r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2].map(n => (
                <div key={n} style={{
                  width: n === step ? 20 : 8, height: 8, borderRadius: 4,
                  background: n <= step ? 'var(--accent)' : 'var(--line-2)',
                  transition: 'width .2s, background .2s',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>步驟 {step} / 2</span>
          </div>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6 }}><Icon.X /></button>
        </div>

        {/* Step 1 — 基本資訊 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>新增產品</div>
            <div className="field">
              <label>產品名稱 <span style={{ color: 'var(--bad)', fontSize: 10, fontWeight: 500 }}>必填</span></label>
              <input autoFocus className="input" placeholder="例如：踩踩獸"
                value={info.name}
                onChange={e => setInfo(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && info.name.trim() && setStep(2)}
              />
            </div>
            <div className="field">
              <label>產品描述</label>
              <input className="input" placeholder="選填"
                value={info.description}
                onChange={e => setInfo(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn primary" disabled={!info.name.trim()} onClick={() => setStep(2)}>
                下一步：設定零件 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — 零件設定 */}
        {step === 2 && (
          <>
            <PartsStep productName={info.name} parts={parts} setParts={setParts} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 4, borderTop: '0.5px solid var(--line-1)' }}>
              <button className="btn" onClick={() => setStep(1)}>← 上一步</button>
              <button className="btn primary" onClick={finish}
                disabled={saving || !parts.some(p => p.name.trim())}>
                {saving ? '建立中…' : '完成建立'}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalOverlay>
  )
}

// ─── Shared: colour picker popover ────────────────────────────
function SkuColorPicker({ onAdd, label = '+ 顏色' }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState({ hex: PRESET_COLORS[0].hex, name: '' })
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function confirm() {
    if (!pending.name.trim()) return
    onAdd({ hex: pending.hex, name: pending.name.trim() })
    setPending({ hex: PRESET_COLORS[0].hex, name: '' })
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        fontSize: 11, color: 'var(--text-3)', background: 'none',
        border: '0.5px dashed var(--line-2)', borderRadius: 999,
        padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
      }}>{label}</button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 60,
          background: 'var(--bg-1)', border: '0.5px solid var(--line-2)',
          borderRadius: 'var(--r-md)', padding: 12, boxShadow: '0 4px 16px rgba(0,0,0,.14)',
          width: 220,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {PRESET_COLORS.map(c => (
              <button key={c.hex} onClick={() => setPending(p => ({ ...p, hex: c.hex, name: p.name || c.name }))}
                title={c.name}
                style={{
                  width: 22, height: 22, borderRadius: '50%', background: c.hex,
                  border: pending.hex === c.hex ? '2px solid var(--text-1)' : '1.5px solid transparent',
                  cursor: 'pointer', padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }}
              />
            ))}
          </div>
          <input autoFocus className="input" placeholder="顏色名稱"
            value={pending.name}
            onChange={e => setPending(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            style={{ fontSize: 12, padding: '6px 9px', marginBottom: 8, width: '100%', boxSizing: 'border-box' }}
          />
          <button className="btn primary" onClick={confirm} disabled={!pending.name.trim()}
            style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
            確認
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PartManageRow — one existing part inside ManagePartsModal ─
function PartManageRow({ part, index, total, isDragging, onDragStart, onDragOver, onDrop, onDragEnd, onRename, onDelete, onMoveUp, onMoveDown, onAddSku, onDeleteSku }) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const [hoverSku, setHoverSku] = useState(null)

  function startEdit() { setEditing(true); setEditVal(part.name) }
  function commitEdit() {
    const v = editVal.trim()
    onRename(v || part.name)
    setEditing(false)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', background: isDragging ? 'var(--bg-3)' : 'var(--bg-2)',
        borderRadius: 'var(--r-md)', marginBottom: 6,
        opacity: isDragging ? 0.4 : 1, transition: 'opacity .1s, background .1s',
      }}
    >
      {/* Grip handle */}
      <span style={{ color: 'var(--text-4)', cursor: 'grab', display: 'flex', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <circle cx="9" cy="5" r="1.2"/><circle cx="15" cy="5" r="1.2"/>
          <circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>
          <circle cx="9" cy="19" r="1.2"/><circle cx="15" cy="19" r="1.2"/>
        </svg>
      </span>

      {/* Name (click to edit) */}
      {editing
        ? <input autoFocus className="input"
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={commitEdit}
            style={{ width: 140, fontSize: 13, padding: '4px 8px', flexShrink: 0 }}
          />
        : <span onClick={startEdit} title="點擊重新命名" style={{
            width: 140, fontSize: 13, fontWeight: 500, cursor: 'text',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {part.name}
          </span>
      }

      {/* SKU pills */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {(part.skus || []).map(sku => (
          <span key={sku.id}
            onMouseEnter={() => setHoverSku(sku.id)}
            onMouseLeave={() => setHoverSku(null)}
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--bg-1)', border: '0.5px solid var(--line-2)',
              borderRadius: 999, padding: '3px 8px 3px 6px', fontSize: 11,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sku.color_hex || '#999', flexShrink: 0, border: '0.5px solid rgba(0,0,0,.12)' }} />
            {sku.color_name}
            {hoverSku === sku.id && (
              <button onClick={e => { e.stopPropagation(); onDeleteSku(sku.id) }} style={{
                position: 'absolute', top: -5, right: -5,
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--bad)', color: '#fff',
                border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            )}
          </span>
        ))}
        <SkuColorPicker onAdd={onAddSku} />
      </div>

      {/* Up / Down / Delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <button onClick={onMoveUp} disabled={index === 0} style={{
          background: 'none', border: 'none', padding: '3px 4px', lineHeight: 1, fontSize: 13,
          cursor: index === 0 ? 'default' : 'pointer',
          color: index === 0 ? 'var(--text-4)' : 'var(--text-3)',
        }}>↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} style={{
          background: 'none', border: 'none', padding: '3px 4px', lineHeight: 1, fontSize: 13,
          cursor: index === total - 1 ? 'default' : 'pointer',
          color: index === total - 1 ? 'var(--text-4)' : 'var(--text-3)',
        }}>↓</button>
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: '3px 4px', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--bad)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
        ><Icon.X /></button>
      </div>
    </div>
  )
}

// ─── ManagePartsModal ──────────────────────────────────────────
function ManagePartsModal({ product, onClose, onChanged }) {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragFrom, setDragFrom] = useState(null)
  const latestParts = useRef([])
  const [newPart, setNewPart] = useState({ name: '', skus: [] })
  const [adding, setAdding] = useState(false)

  useEffect(() => { load() }, [product.id])
  useEffect(() => { latestParts.current = parts }, [parts])

  async function load() {
    setLoading(true)
    const res = await apiFetch(`/api/products/${product.id}/parts`)
    setParts(await res.json())
    setLoading(false)
  }

  async function saveOrder(ordered) {
    await Promise.all(ordered.map((p, idx) =>
      apiFetch(`/api/parts/${p.id}`, { method: 'PUT', body: JSON.stringify({ name: p.name, sort_order: idx }) })
    ))
  }

  async function renamePart(part, newName) {
    if (!newName || newName === part.name) return
    await apiFetch(`/api/parts/${part.id}`, { method: 'PUT', body: JSON.stringify({ name: newName, sort_order: part.sort_order || 0 }) })
    setParts(ps => ps.map(p => p.id === part.id ? { ...p, name: newName } : p))
  }

  async function deletePart(part) {
    if (!confirm(`刪除「${part.name}」？此零件的所有加工紀錄將一併刪除。`)) return
    await apiFetch(`/api/parts/${part.id}`, { method: 'DELETE' })
    const updated = parts.filter(p => p.id !== part.id)
    setParts(updated)
    await saveOrder(updated)
    onChanged?.()
  }

  async function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= parts.length) return
    const np = [...parts]
    ;[np[i], np[j]] = [np[j], np[i]]
    setParts(np)
    await saveOrder(np)
  }

  function onDragStart(i) { setDragFrom(i) }
  function onDragOver(e, i) {
    e.preventDefault()
    if (dragFrom === null || dragFrom === i) return
    const np = [...latestParts.current]
    const [moved] = np.splice(dragFrom, 1)
    np.splice(i, 0, moved)
    setParts(np)
    setDragFrom(i)
  }
  async function onDragEnd() {
    setDragFrom(null)
    await saveOrder(latestParts.current)
  }

  async function addSkuToPart(partId, sku) {
    const r = await apiFetch(`/api/parts/${partId}/skus`, { method: 'POST', body: JSON.stringify({ color_name: sku.name, color_hex: sku.hex }) })
    const { id } = await r.json()
    setParts(ps => ps.map(p => p.id === partId ? { ...p, skus: [...(p.skus || []), { id, color_name: sku.name, color_hex: sku.hex }] } : p))
  }

  async function deleteSkuFromPart(partId, skuId) {
    await apiFetch(`/api/parts/${partId}/skus/${skuId}`, { method: 'DELETE' })
    setParts(ps => ps.map(p => p.id === partId ? { ...p, skus: (p.skus || []).filter(s => s.id !== skuId) } : p))
  }

  async function addPart() {
    if (!newPart.name.trim()) return
    setAdding(true)
    try {
      const r = await apiFetch('/api/parts', { method: 'POST', body: JSON.stringify({ product_id: product.id, name: newPart.name.trim(), sort_order: parts.length }) })
      const { id: partId } = await r.json()
      const skuRecs = []
      for (const sku of newPart.skus) {
        const sr = await apiFetch(`/api/parts/${partId}/skus`, { method: 'POST', body: JSON.stringify({ color_name: sku.name, color_hex: sku.hex }) })
        const { id } = await sr.json()
        skuRecs.push({ id, color_name: sku.name, color_hex: sku.hex })
      }
      setParts(ps => [...ps, { id: partId, name: newPart.name.trim(), sort_order: parts.length, skus: skuRecs }])
      setNewPart({ name: '', skus: [] })
      onChanged?.()
    } finally { setAdding(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 560, background: 'var(--bg-1)', borderRadius: 'var(--r-lg)', padding: 24, display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>「{product.name}」的零件</div>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6 }}><Icon.X /></button>
        </div>

        {/* Existing parts */}
        {loading
          ? <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>載入中…</div>
          : parts.length === 0
            ? <div style={{ padding: '16px 0 8px', textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>還沒有零件 · 在下方新增第一個零件</div>
            : <div>
                {parts.map((part, i) => (
                  <PartManageRow key={part.id} part={part} index={i} total={parts.length}
                    isDragging={dragFrom === i}
                    onDragStart={() => onDragStart(i)}
                    onDragOver={e => onDragOver(e, i)}
                    onDrop={e => e.preventDefault()}
                    onDragEnd={onDragEnd}
                    onRename={newName => renamePart(part, newName)}
                    onDelete={() => deletePart(part)}
                    onMoveUp={() => move(i, -1)}
                    onMoveDown={() => move(i, 1)}
                    onAddSku={sku => addSkuToPart(part.id, sku)}
                    onDeleteSku={skuId => deleteSkuFromPart(part.id, skuId)}
                  />
                ))}
              </div>
        }

        {/* Divider + add section */}
        <div style={{ borderTop: '0.5px solid var(--line-1)', margin: '14px 0 10px' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em', marginBottom: 10 }}>新增零件</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
          <input className="input" placeholder="零件名稱，例如：L夾"
            value={newPart.name}
            onChange={e => setNewPart(r => ({ ...r, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && !adding && addPart()}
            style={{ width: 140, fontSize: 13, padding: '7px 10px', flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            {newPart.skus.map((sku, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--bg-2)', border: '0.5px solid var(--line-2)',
                borderRadius: 999, padding: '3px 8px 3px 6px', fontSize: 11,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sku.hex, flexShrink: 0, border: '0.5px solid rgba(0,0,0,.12)' }} />
                {sku.name}
                <button onClick={() => setNewPart(r => ({ ...r, skus: r.skus.filter((_, idx) => idx !== i) }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0, lineHeight: 1, fontSize: 12 }}>×</button>
              </span>
            ))}
            <SkuColorPicker onAdd={sku => setNewPart(r => ({ ...r, skus: [...r.skus, sku] }))} />
          </div>
          <button className="btn primary" onClick={addPart} disabled={adding || !newPart.name.trim()}
            style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {adding ? '新增中…' : '+ 新增'}
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '0.5px solid var(--line-1)' }}>
          <button className="btn" onClick={onClose}>完成</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Page: Settings ───────────────────────────────────────────
function SettingsPage({ products, orders, reload, onGoToProcess, onGoToOrders }) {
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [managePartsTarget, setManagePartsTarget] = useState(null) // product | null
  const [adjustModal, setAdjustModal] = useState(null) // product | null
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)
  const [historyData, setHistoryData] = useState({}) // productId → rows
  const [editingProductId, setEditingProductId] = useState(null)
  const [editingProductName, setEditingProductName] = useState('')

  async function loadHistory(productId) {
    const res = await apiFetch(`/api/stock-adjustments?product_id=${productId}&limit=5`)
    const data = await res.json().catch(() => [])
    setHistoryData(h => ({ ...h, [productId]: data }))
  }

  function toggleHistory(productId) {
    if (expandedHistoryId === productId) { setExpandedHistoryId(null); return }
    setExpandedHistoryId(productId)
    loadHistory(productId)
  }

  async function renameProduct(p, newName) {
    const name = newName.trim()
    setEditingProductId(null)
    if (!name || name === p.name) return
    await apiFetch(`/api/products/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description: p.description || '', order_qty: p.order_qty || 0, order_date: p.order_date || '', estimated_completion: p.estimated_completion || '' }),
    })
    reload()
  }

  async function deleteProduct(p) {
    if (!confirm(`確認刪除「${p.name}」？此操作無法復原，該產品的所有零件也會一併刪除。`)) return
    await apiFetch(`/api/products/${p.id}`, { method: 'DELETE' })
    localStorage.removeItem(`prod-img-${p.id}`)
    reload()
  }

  // ti-adjustments-horizontal icon
  const AdjustIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" width="13" height="13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="6" r="2"/><path d="M4 6h8m4 0h4"/>
      <circle cx="8" cy="12" r="2"/><path d="M4 12h2m4 0h10"/>
      <circle cx="17" cy="18" r="2"/><path d="M4 18h11m4 0h1"/>
    </svg>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn primary" style={{ fontSize: 13 }} onClick={() => setShowNewProduct(true)}>
          <Icon.Plus />新增產品
        </button>
      </div>

      {/* Product cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {products.map(p => {
          const orderCount = orders.filter(o => o.productId === p.id).length
          const adjCount = p.adjustment_count || 0
          const historyRows = historyData[p.id] || []
          return (
            <div key={p.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Top: image + info */}
              <div style={{ display: 'flex', gap: 14 }}>
                <ProductImageUpload
                  productId={p.id}
                  brandColor={p.brand_color || '#E8461A'}
                  initials={p.initials || p.name?.slice(0, 2)}
                  width={80} height={80} borderRadius={8}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    {editingProductId === p.id
                      ? <input
                          autoFocus
                          className="input"
                          value={editingProductName}
                          onChange={e => setEditingProductName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') renameProduct(p, editingProductName)
                            if (e.key === 'Escape') setEditingProductId(null)
                          }}
                          onBlur={() => renameProduct(p, editingProductName)}
                          style={{ fontSize: 15, fontWeight: 600, padding: '2px 6px', flex: 1 }}
                        />
                      : <div
                          onClick={() => { setEditingProductId(p.id); setEditingProductName(p.name) }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            cursor: 'text', flex: 1,
                            padding: '2px 6px', borderRadius: 'var(--r-sm)', marginLeft: -6,
                            border: '1px dashed transparent',
                            transition: 'border-color .15s, background .15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.querySelector('.edit-hint').style.opacity = '1' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.edit-hint').style.opacity = '0' }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                          <span className="edit-hint" style={{ opacity: 0, transition: 'opacity .15s', color: 'var(--text-4)', display: 'flex' }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </span>
                        </div>
                    }
                    <button onClick={() => deleteProduct(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--bad)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}>
                      <Icon.X />
                    </button>
                  </div>
                  {p.description && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{p.description}</div>}
                </div>
              </div>

              {/* Stock summary row */}
              <div style={{ padding: '10px 0', borderTop: '1px solid var(--line-1)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 500 }}>{p.warehouse_total || 0}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>倉庫庫存</div>
                    </div>
                    <div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 500, color: '#185FA5' }}>{p.in_transit_total || 0}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>加工中數量</div>
                    </div>
                    {(p.defect_total || 0) > 0 && (
                      <div>
                        <div className="num" style={{ fontSize: 16, fontWeight: 500, color: '#E8461A' }}>{p.defect_total}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>待處理不良</div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setAdjustModal(p)}
                    title="手動修正倉庫庫存"
                    style={{
                      appearance: 'none', border: '1px solid var(--line-2)', background: 'var(--bg-1)',
                      borderRadius: 'var(--r-sm)', padding: '4px 9px', cursor: 'pointer', font: 'inherit',
                      fontSize: 11, color: 'var(--text-3)',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'color .1s, border-color .1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--line-3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}
                  >
                    <AdjustIcon />手動修正
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--line-1)', paddingTop: 10 }}>
                <button className="btn" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }} onClick={() => onGoToProcess(p)}>
                  <Icon.Flow />加工流程
                </button>
                <button className="btn" style={{ fontSize: 12, justifyContent: 'center', whiteSpace: 'nowrap' }} onClick={() => setManagePartsTarget(p)}>
                  管理零件
                </button>
                <button className="btn" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }} onClick={() => onGoToOrders(p.id)}>
                  <Icon.Order />訂單
                  {orderCount > 0 && (
                    <span style={{ marginLeft: 4, background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 600 }}>
                      {orderCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Adjustment history */}
              {adjCount > 0 && (
                <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 8 }}>
                  <button className="btn ghost" style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 6px', gap: 4 }}
                    onClick={() => toggleHistory(p.id)}>
                    <svg viewBox="0 0 12 12" fill="none" width="10" height="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: expandedHistoryId === p.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
                      <path d="M2 4l4 4 4-4"/>
                    </svg>
                    查看修正紀錄 {adjCount} 筆
                  </button>
                  {expandedHistoryId === p.id && historyRows.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {historyRows.map(adj => (
                        <div key={adj.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 8px', background: 'var(--bg-2)', borderRadius: 6,
                          fontSize: 11,
                        }}>
                          <span style={{ color: 'var(--text-4)', flexShrink: 0, minWidth: 52 }}>{timeAgo(adj.adjusted_at)}</span>
                          <span className="num" style={{ color: 'var(--text-2)', flexShrink: 0 }}>{adj.previous_qty} → {adj.new_qty}</span>
                          <span style={{ fontWeight: 600, color: adj.diff > 0 ? 'var(--ok)' : 'var(--bad)', flexShrink: 0 }}>
                            {adj.diff > 0 ? `+${adj.diff}` : adj.diff}
                          </span>
                          <span style={{ color: 'var(--text-3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adj.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New product modal */}
      {showNewProduct && (
        <NewProductModal
          onClose={() => setShowNewProduct(false)}
          onCreated={() => { setShowNewProduct(false); reload() }}
        />
      )}

      {/* Manage parts modal */}
      {managePartsTarget && (
        <ManagePartsModal
          product={managePartsTarget}
          onClose={() => setManagePartsTarget(null)}
          onChanged={reload}
        />
      )}

      {/* Stock adjust modal */}
      {adjustModal && (
        <StockAdjustModal
          product={adjustModal}
          onClose={() => setAdjustModal(null)}
          onReload={() => {
            setHistoryData(h => { const n = { ...h }; delete n[adjustModal.id]; return n })
            if (expandedHistoryId === adjustModal.id) setExpandedHistoryId(null)
            reload()
          }}
        />
      )}
    </div>
  )
}


// ─── Page: Orders ─────────────────────────────────────────────
function OrdersPage({ orders, saveOrders, products, showNew, setShowNew, filterProductId, setFilterProductId }) {
  const filtered = filterProductId ? orders.filter(o => o.productId === filterProductId) : orders
  const filterProduct = filterProductId ? products.find(p => p.id === filterProductId) : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>進行中訂單</h2>
        <span className="num" style={{ color: 'var(--text-3)', fontSize: 13 }}>· {filtered.length}</span>
        {filterProduct && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '3px 10px 3px 12px', fontSize: 12, fontWeight: 500 }}>
            {filterProduct.name}
            <button onClick={() => setFilterProductId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'grid', placeItems: 'center', opacity: 0.8 }}>
              <Icon.X />
            </button>
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {filtered.map(o => {
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
        {filtered.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 13, gridColumn: '1/-1' }}>尚無訂單</p>}
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
// ─── Page: Factories（加工廠商）────────────────────────────────
const FACTORY_AVATAR_COLORS = ['#444441', '#378ADD', '#E8461A', '#1A7A3C', '#B07D00', '#6A1B9A']
function factoryAvatarColor(f) {
  if (f.color) return f.color
  const code = f.name ? f.name.charCodeAt(0) : 0
  return FACTORY_AVATAR_COLORS[code % FACTORY_AVATAR_COLORS.length]
}

function FactoryStatusBadge({ status }) {
  const active = status !== 'inactive'
  return (
    <span style={{
      fontSize: 12, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
      background: active ? '#EAF3DE' : '#F1EFE8', color: active ? '#27500A' : '#888',
    }}>
      {active ? '合作中' : '暫停合作'}
    </span>
  )
}

function FactoriesPage() {
  const [factories, setFactories] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | { mode: 'new' } | { mode: 'edit', factory }
  const [mergeTarget, setMergeTarget] = useState(null) // factory being merged away

  useEffect(() => { loadFactories() }, [])

  async function loadFactories() {
    try {
      const res = await apiFetch('/api/factories')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFactories(await res.json())
    } catch (e) { alert('載入廠商失敗：' + e.message) }
  }

  async function toggleStatus(f) {
    const next = f.status === 'inactive' ? 'active' : 'inactive'
    if (next === 'inactive' && !confirm(`停用「${f.name}」？停用後不會影響現有加工紀錄。`)) return
    try {
      const res = await apiFetch(`/api/factories/${f.id}/status`, { method: 'PUT', body: JSON.stringify({ status: next }) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      loadFactories()
    } catch (e) { alert('更新狀態失敗：' + e.message) }
  }

  const q = search.trim()
  const filtered = !q ? factories : factories.filter(f =>
    f.name?.includes(q) || f.specialty?.includes(q) || f.phone?.includes(q) || f.contact_name?.includes(q)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>加工廠商</h2>
        <button className="btn primary" onClick={() => setModal({ mode: 'new' })}><Icon.Plus />新增廠商</button>
      </div>

      <input className="input" placeholder="搜尋廠商名稱、加工類型、聯絡方式..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{filtered.length} 個廠商</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)' }}>
                {['廠商名稱', '加工類型', '聯絡電話', '聯絡人', '地址', '狀態', '備註', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 400, color: 'var(--text-3)', borderBottom: '1px solid var(--line-1)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>尚無廠商資料</td></tr>}
              {filtered.map(f => {
                const isInHouse = f.name === '廠內'
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--line-1)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: factoryAvatarColor(f), color: '#fff',
                          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600,
                        }}>
                          {f.name ? f.name[0] : '?'}
                        </span>
                        <span style={{ fontWeight: 500 }}>{f.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{f.specialty || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{isInHouse ? '—' : (f.phone || '—')}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{isInHouse ? '—' : (f.contact_name || '—')}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{isInHouse ? '廠內自製' : (f.address || '—')}</td>
                    <td style={{ padding: '10px 14px' }}><FactoryStatusBadge status={f.status} /></td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 12 }}>{f.note || ''}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setModal({ mode: 'edit', factory: f })}>編輯</button>
                        {!isInHouse && (
                          <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleStatus(f)}>
                            {f.status === 'inactive' ? '恢復' : '停用'}
                          </button>
                        )}
                        {!isInHouse && (
                          <button
                            onClick={() => setMergeTarget(f)}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                              color: 'var(--text-3)', border: '0.5px solid var(--line-2)', background: 'var(--bg-1)',
                              transition: 'color .1s, border-color .1s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#185FA5'; e.currentTarget.style.borderColor = '#185FA5' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}
                          >合併</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <FactoryModal
          mode={modal.mode}
          factory={modal.factory}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadFactories() }}
        />
      )}

      {mergeTarget && (
        <FactoryMergeModal
          factory={mergeTarget}
          factories={factories}
          onClose={() => setMergeTarget(null)}
          onMerged={() => { setMergeTarget(null); loadFactories() }}
        />
      )}
    </div>
  )
}

function FactoryMergeModal({ factory, factories, onClose, onMerged }) {
  const others = factories.filter(f => f.id !== factory.id && f.name !== '廠內')
  const [targetId, setTargetId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const target = others.find(f => String(f.id) === String(targetId))

  async function confirmMerge() {
    if (!targetId || !target) return alert('請選擇合併目標')
    if (!confirm(`確認將「${factory.name}」合併到「${target.name}」？此動作無法還原。`)) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/factories/${factory.id}/merge`, {
        method: 'POST', body: JSON.stringify({ target_id: targetId, note: note.trim() }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      onMerged()
    } catch (e) { alert('合併失敗：' + e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 440, background: 'var(--bg-1)', borderRadius: 'var(--r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>合併廠商</div>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6 }}><Icon.X /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -6 }}>
          將此廠商的所有加工紀錄合併到另一個廠商，合併後此廠商將被刪除。
        </div>

        <div className="field">
          <label>來源廠商</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 'var(--r-md)' }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: factoryAvatarColor(factory), color: '#fff',
              display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600,
            }}>{factory.name ? factory.name[0] : '?'}</span>
            <span style={{ fontWeight: 500 }}>{factory.name}</span>
          </div>
        </div>

        <div className="field">
          <label>合併到 <span style={{ color: 'var(--bad)', fontSize: 10, fontWeight: 500 }}>必填</span></label>
          <select className="select" value={targetId} onChange={e => setTargetId(e.target.value)}>
            <option value="">請選擇目標廠商</option>
            {others.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {target && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginTop: 8, background: 'var(--bg-2)', borderRadius: 'var(--r-md)' }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: factoryAvatarColor(target), color: '#fff',
                display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600,
              }}>{target.name ? target.name[0] : '?'}</span>
              <span style={{ fontWeight: 500 }}>{target.name}</span>
            </div>
          )}
        </div>

        <div className="field">
          <label>備註（選填）</label>
          <textarea className="input" rows={2} style={{ resize: 'vertical' }}
            placeholder="例如：花壇廠、主廠聯絡人改為..."
            value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button
            disabled={saving || !targetId}
            onClick={confirmMerge}
            style={{
              padding: '7px 16px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500,
              background: '#185FA5', color: '#fff', border: '1px solid #185FA5',
              cursor: saving || !targetId ? 'default' : 'pointer',
              opacity: saving || !targetId ? 0.6 : 1,
            }}
          >{saving ? '合併中…' : '確認合併'}</button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function FactoryModal({ mode, factory, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: factory?.name || '', specialty: factory?.specialty || '', phone: factory?.phone || '',
    contact_name: factory?.contact_name || '', address: factory?.address || '', note: factory?.note || '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return alert('請填寫廠商名稱')
    setSaving(true)
    try {
      const url = mode === 'edit' ? `/api/factories/${factory.id}` : '/api/factories'
      const res = await apiFetch(url, { method: mode === 'edit' ? 'PUT' : 'POST', body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      onSaved()
    } catch (e) { alert('儲存失敗：' + e.message) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 480, background: 'var(--bg-1)', borderRadius: 'var(--r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{mode === 'edit' ? '編輯廠商' : '新增廠商'}</div>
          <button className="btn ghost" onClick={onClose} style={{ padding: 6 }}><Icon.X /></button>
        </div>

        <div className="field">
          <label>廠商名稱 <span style={{ color: 'var(--bad)', fontSize: 10, fontWeight: 500 }}>必填</span></label>
          <input autoFocus className="input" placeholder="例如：崇淮企業" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && save()} />
          {mode !== 'edit' && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              廠商名稱請使用正式名稱，備註欄可填寫暱稱或分廠說明
            </div>
          )}
        </div>
        <div className="field">
          <label>加工類型</label>
          <input className="input" placeholder="例如：CNC 車銑・陽極處理" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} />
        </div>
        <div className="field">
          <label>聯絡電話</label>
          <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div className="field">
          <label>聯絡人</label>
          <input className="input" value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} />
        </div>
        <div className="field">
          <label>地址</label>
          <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="field">
          <label>備註</label>
          <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" disabled={saving || !form.name.trim()} onClick={save}>
            {saving ? '儲存中…' : (mode === 'edit' ? '儲存' : '新增')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function BrandsPage({ products }) {
  const [brands, setBrands] = useState([])
  const [newName, setNewName] = useState('')
  const [assignSelects, setAssignSelects] = useState({}) // brandId → selected product_id

  useEffect(() => { loadBrands() }, [])

  async function loadBrands() {
    try {
      const res = await apiFetch('/api/brands')
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      setBrands(await res.json())
    } catch (e) { alert('載入品牌失敗：' + e.message) }
  }
  async function createBrand() {
    if (!newName.trim()) return alert('請填寫品牌名稱')
    try {
      const res = await apiFetch('/api/brands', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      setNewName(''); loadBrands()
    } catch (e) { alert('新增品牌失敗：' + e.message) }
  }
  async function deleteBrand(id) {
    if (!confirm('確認刪除此品牌？')) return
    try {
      const res = await apiFetch(`/api/brands/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      loadBrands()
    } catch (e) { alert('刪除品牌失敗：' + e.message) }
  }
  async function assignProduct(brandId) {
    const productId = assignSelects[brandId]
    if (!productId) return alert('請先選擇產品')
    try {
      const res = await apiFetch(`/api/brands/${brandId}/products`, { method: 'POST', body: JSON.stringify({ product_id: productId }) })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
      setAssignSelects(s => ({ ...s, [brandId]: '' })); loadBrands()
    } catch (e) { alert('指派失敗：' + e.message) }
  }
  async function removeProduct(brandId, productId) {
    try {
      const res = await apiFetch(`/api/brands/${brandId}/products/${productId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      loadBrands()
    } catch (e) { alert('移除失敗：' + e.message) }
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

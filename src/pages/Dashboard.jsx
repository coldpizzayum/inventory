import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const ACTION_LABELS = { receive: '進貨', send: '送出加工', return: '回廠', ship: '大貨出貨' }
const TABS = [
  { key: 'overview',    label: '庫存總覽' },
  { key: 'stages',      label: '加工流程站' },
  { key: 'skus',        label: 'SKU顏色庫存' },
  { key: 'defects',     label: '不良率圖表' },
  { key: 'orders',      label: '訂單達成率' },
  { key: 'packing',     label: '包裝副件' },
  { key: 'logs',        label: '進出貨記錄' },
  { key: 'settings',    label: '⚙ 設定' },
]

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) }
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('未授權')
  }
  return res
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [partsData, setPartsData] = useState([])
  const [logs, setLogs] = useState([])
  const [packingItems, setPackingItems] = useState([])
  const [tokens, setTokens] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    loadProducts()
    loadAlerts()
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

  async function loadAlerts() {
    const res = await apiFetch('/api/alerts')
    setAlerts(await res.json())
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const selProd = selectedProduct

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <span className="font-bold text-lg">工廠庫存管理系統</span>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
              ⚠ {alerts.length} 低庫存
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <select
            className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm border border-slate-600 focus:outline-none"
            value={selProd?.id || ''}
            onChange={e => {
              const p = products.find(x => x.id === e.target.value)
              setSelectedProduct(p || null)
            }}
          >
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={logout} className="text-slate-300 hover:text-white text-sm">登出</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 flex overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'settings') loadTokens() }}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {!selProd ? (
          <EmptyState onAdd={() => setTab('settings')} />
        ) : (
          <>
            {tab === 'overview'  && <OverviewTab product={selProd} parts={partsData} logs={logs} />}
            {tab === 'stages'    && <StagesTab parts={partsData} reload={() => loadParts(selProd.id)} />}
            {tab === 'skus'      && <SkusTab parts={partsData} logs={logs} />}
            {tab === 'defects'   && <DefectsTab parts={partsData} logs={logs} />}
            {tab === 'orders'    && <OrdersTab product={selProd} parts={partsData} logs={logs} onSave={loadProducts} />}
            {tab === 'packing'   && <PackingTab items={packingItems} product={selProd} reload={() => loadPacking(selProd.id)} />}
            {tab === 'logs'      && <LogsTab logs={logs} product={selProd} reload={() => loadLogs(selProd.id)} />}
            {tab === 'settings'  && <SettingsTab products={products} tokens={tokens} reload={loadProducts} reloadTokens={loadTokens} />}
          </>
        )}
      </main>
    </div>
  )
}

/* ─── Overview Tab ─── */
function OverviewTab({ product, parts, logs }) {
  const totalStock = parts.reduce((s, p) => s + p.stages.reduce((a, st) => a + st.current_stock, 0), 0)
  const totalDefects = parts.reduce((s, p) => s + p.stages.reduce((a, st) => a + st.total_defect, 0), 0)
  const shipped = logs.filter(l => l.action_type === 'ship').reduce((s, l) => s + l.qty, 0)
  const fulfillRate = product.order_qty > 0 ? Math.round(shipped / product.order_qty * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
          <p className="text-gray-500">{product.description}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>訂單數量：<strong className="text-gray-800">{product.order_qty?.toLocaleString()}</strong> 件</div>
          <div>訂單日期：{product.order_date}</div>
          {product.estimated_completion && (
            <div className="text-blue-600 font-medium">預計完成：{product.estimated_completion}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="總庫存" value={totalStock.toLocaleString()} color="blue" icon="📦" />
        <StatCard label="零件種類" value={parts.length} color="purple" icon="🔩" />
        <StatCard label="累積不良品" value={totalDefects.toLocaleString()} color="red" icon="⚠️" />
        <StatCard label="出貨量" value={`${shipped.toLocaleString()} / ${product.order_qty?.toLocaleString()}`} color="green" icon="🚚" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">訂單達成率 {fulfillRate}%</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${fulfillRate >= 100 ? 'bg-green-500' : fulfillRate >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
            style={{ width: `${Math.min(fulfillRate, 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">零件庫存狀態</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left py-2 pr-4">零件</th>
                <th className="text-right py-2 px-3">在庫</th>
                <th className="text-right py-2 px-3">送出</th>
                <th className="text-right py-2 px-3">回廠</th>
                <th className="text-right py-2 px-3">不良品</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => {
                const s0 = p.stages[0] || {}
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{p.name}</td>
                    <td className="text-right py-2 px-3">{s0.current_stock ?? 0}</td>
                    <td className="text-right py-2 px-3 text-orange-600">{s0.total_sent ?? 0}</td>
                    <td className="text-right py-2 px-3 text-green-600">{s0.total_returned ?? 0}</td>
                    <td className="text-right py-2 px-3 text-red-500">{s0.total_defect ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Stages Tab ─── */
function StagesTab({ parts, reload }) {
  const [addStage, setAddStage] = useState(null)
  const [form, setForm] = useState({ factory_name: '', action_name: '' })

  const FACTORIES = ['黑豬鋁','家佑','阿奇','廠內','雷射','小林','良浩','阿勗','拋台李','至威','永勝','豪成','勗成']

  async function saveStage(partId) {
    await apiFetch(`/api/parts/${partId}/stages`, {
      method: 'POST',
      body: JSON.stringify({ ...form, sort_order: 99 })
    })
    setAddStage(null)
    setForm({ factory_name: '', action_name: '' })
    reload()
  }

  async function deleteStage(partId, stageId) {
    if (!confirm('確認刪除此加工站？')) return
    await apiFetch(`/api/parts/${partId}/stages/${stageId}`, { method: 'DELETE' })
    reload()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">加工流程站</h2>
      {parts.map(part => (
        <div key={part.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">{part.name}</h3>
            <button
              onClick={() => setAddStage(addStage === part.id ? null : part.id)}
              className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg"
            >+ 新增加工站</button>
          </div>
          {addStage === part.id && (
            <div className="flex gap-3 mb-3 p-3 bg-blue-50 rounded-lg">
              <select
                className="border rounded px-2 py-1.5 text-sm"
                value={form.factory_name}
                onChange={e => setForm(f => ({ ...f, factory_name: e.target.value }))}
              >
                <option value="">選擇加工廠</option>
                {FACTORIES.map(f => <option key={f}>{f}</option>)}
              </select>
              <input
                className="border rounded px-2 py-1.5 text-sm flex-1"
                placeholder="作業名稱（如：CNC加工）"
                value={form.action_name}
                onChange={e => setForm(f => ({ ...f, action_name: e.target.value }))}
              />
              <button onClick={() => saveStage(part.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">儲存</button>
              <button onClick={() => setAddStage(null)} className="text-gray-500 px-2 text-sm">取消</button>
            </div>
          )}
          {part.stages.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無加工站</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {part.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-400">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium">{stage.factory_name}</div>
                    <div className="text-xs text-gray-500">{stage.action_name}</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-sm font-bold text-blue-600">{stage.current_stock}</div>
                    <div className="text-xs text-gray-400">在庫</div>
                  </div>
                  <button
                    onClick={() => deleteStage(part.id, stage.id)}
                    className="text-red-400 hover:text-red-600 ml-1 text-xs"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── SKU Tab ─── */
function SkusTab({ parts, logs }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">SKU 顏色庫存</h2>
      {parts.map(part => (
        <div key={part.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">{part.name}</h3>
          {part.skus.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無 SKU</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2">顏色</th>
                    <th className="text-right py-2 px-3">進貨</th>
                    <th className="text-right py-2 px-3">送加工</th>
                    <th className="text-right py-2 px-3">回廠</th>
                    <th className="text-right py-2 px-3">出貨</th>
                    <th className="text-right py-2 px-3">不良</th>
                    <th className="text-right py-2 px-3">估計在庫</th>
                  </tr>
                </thead>
                <tbody>
                  {part.skus.map(sku => {
                    const skuLogs = logs.filter(l => l.part_id === part.id && l.sku_color === sku.color_name)
                    const receive = skuLogs.filter(l => l.action_type === 'receive').reduce((s, l) => s + l.qty, 0)
                    const send    = skuLogs.filter(l => l.action_type === 'send').reduce((s, l) => s + l.qty, 0)
                    const ret     = skuLogs.filter(l => l.action_type === 'return').reduce((s, l) => s + l.qty, 0)
                    const ship    = skuLogs.filter(l => l.action_type === 'ship').reduce((s, l) => s + l.qty, 0)
                    const defect  = skuLogs.reduce((s, l) => s + (l.defect_qty || 0), 0)
                    const est = receive + ret - send - ship
                    return (
                      <tr key={sku.id} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{sku.color_name}</span>
                        </td>
                        <td className="text-right py-2 px-3">{receive}</td>
                        <td className="text-right py-2 px-3 text-orange-500">{send}</td>
                        <td className="text-right py-2 px-3 text-green-600">{ret}</td>
                        <td className="text-right py-2 px-3 text-blue-600">{ship}</td>
                        <td className="text-right py-2 px-3 text-red-500">{defect}</td>
                        <td className={`text-right py-2 px-3 font-bold ${est < 0 ? 'text-red-500' : 'text-gray-800'}`}>{est}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Defects Tab ─── */
function DefectsTab({ parts, logs }) {
  const chartData = parts.map(part => {
    const partLogs = logs.filter(l => l.part_id === part.id)
    const totalQty = partLogs.reduce((s, l) => s + l.qty, 0)
    const defects  = partLogs.reduce((s, l) => s + (l.defect_qty || 0), 0)
    const rate = totalQty > 0 ? +(defects / totalQty * 100).toFixed(2) : 0
    return { name: part.name.length > 6 ? part.name.slice(0, 6) + '…' : part.name, rate, defects, totalQty }
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">不良率圖表</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-600 mb-4">各零件不良率 (%)</h3>
        {chartData.length === 0 ? (
          <p className="text-gray-400 text-sm">尚無資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v}%`, '不良率']} />
              <Bar dataKey="rate" name="不良率" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.rate > 5 ? '#ef4444' : entry.rate > 2 ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-600 mb-3">不良品明細</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="text-left py-2">零件</th>
              <th className="text-right py-2 px-3">總量</th>
              <th className="text-right py-2 px-3">不良品</th>
              <th className="text-right py-2 px-3">不良率</th>
              <th className="py-2 px-3">狀態</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((r, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium">{parts[i]?.name}</td>
                <td className="text-right py-2 px-3">{r.totalQty}</td>
                <td className="text-right py-2 px-3 text-red-500">{r.defects}</td>
                <td className="text-right py-2 px-3">{r.rate}%</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.rate > 5 ? 'bg-red-100 text-red-600' : r.rate > 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600'
                  }`}>
                    {r.rate > 5 ? '⚠ 異常' : r.rate > 2 ? '注意' : '正常'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Orders Tab ─── */
function OrdersTab({ product, parts, logs, onSave }) {
  const [editing, setEditing] = useState(false)
  const [completion, setCompletion] = useState(product.estimated_completion || '')

  const shipped = logs.filter(l => l.action_type === 'ship').reduce((s, l) => s + l.qty, 0)
  const fulfillRate = product.order_qty > 0 ? Math.min(100, Math.round(shipped / product.order_qty * 100)) : 0

  const pieData = [
    { name: '已出貨', value: shipped, fill: '#22c55e' },
    { name: '未出貨', value: Math.max(0, product.order_qty - shipped), fill: '#e5e7eb' },
  ]

  async function saveCompletion() {
    await apiFetch(`/api/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...product, estimated_completion: completion })
    })
    setEditing(false)
    onSave()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">訂單達成率</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-600 mb-4">出貨進度</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <span className="text-3xl font-bold text-blue-600">{fulfillRate}%</span>
            <div className="text-sm text-gray-500 mt-1">{shipped.toLocaleString()} / {product.order_qty?.toLocaleString()} 件</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-600">訂單資訊</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">訂單數量</span><strong>{product.order_qty?.toLocaleString()} 件</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">訂單日期</span><span>{product.order_date}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">預計完成</span>
              {editing ? (
                <div className="flex gap-2">
                  <input type="date" value={completion} onChange={e => setCompletion(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  <button onClick={saveCompletion} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">儲存</button>
                  <button onClick={() => setEditing(false)} className="text-gray-400 px-1 text-xs">取消</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={product.estimated_completion ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                    {product.estimated_completion || '未設定'}
                  </span>
                  <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-blue-500">✏️</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Packing Tab ─── */
function PackingTab({ items, product, reload }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', supplier: '', stock: 0 })
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})

  async function addItem() {
    await apiFetch('/api/packing-items', {
      method: 'POST',
      body: JSON.stringify({ product_id: product.id, ...form })
    })
    setForm({ name: '', supplier: '', stock: 0 })
    setShowAdd(false)
    reload()
  }

  async function updateItem(id) {
    await apiFetch(`/api/packing-items/${id}`, { method: 'PUT', body: JSON.stringify(editData) })
    setEditId(null)
    reload()
  }

  async function deleteItem(id) {
    if (!confirm('確認刪除？')) return
    await apiFetch(`/api/packing-items/${id}`, { method: 'DELETE' })
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">包裝副件</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ 新增副件</button>
      </div>
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <input className="border rounded px-2 py-1.5 text-sm flex-1" placeholder="副件名稱" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="border rounded px-2 py-1.5 text-sm w-32" placeholder="供應商" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
          <input type="number" className="border rounded px-2 py-1.5 text-sm w-24" placeholder="庫存" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} />
          <button onClick={addItem} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">新增</button>
          <button onClick={() => setShowAdd(false)} className="text-gray-400 px-2 text-sm">取消</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">副件名稱</th>
              <th className="text-left py-3 px-3">供應商</th>
              <th className="text-right py-3 px-3">庫存</th>
              <th className="text-right py-3 px-3">本月進</th>
              <th className="text-right py-3 px-3">本月出</th>
              <th className="text-right py-3 px-3">不良</th>
              <th className="py-3 px-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">尚無包裝副件</td></tr>
            )}
            {items.map(item => editId === item.id ? (
              <tr key={item.id} className="border-b bg-yellow-50">
                <td className="py-2 px-4"><input className="border rounded px-2 py-1 text-sm w-full" value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} /></td>
                <td className="py-2 px-3"><input className="border rounded px-2 py-1 text-sm w-full" value={editData.supplier} onChange={e => setEditData(d => ({ ...d, supplier: e.target.value }))} /></td>
                {['stock', 'month_in', 'month_out', 'defect'].map(k => (
                  <td key={k} className="py-2 px-3"><input type="number" className="border rounded px-1 py-1 text-sm w-16 text-right" value={editData[k] ?? 0} onChange={e => setEditData(d => ({ ...d, [k]: +e.target.value }))} /></td>
                ))}
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => updateItem(item.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">儲存</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 px-1 text-xs">取消</button>
                </td>
              </tr>
            ) : (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 font-medium">{item.name}</td>
                <td className="py-2 px-3 text-gray-500">{item.supplier || '-'}</td>
                <td className="text-right py-2 px-3 font-bold">{item.stock}</td>
                <td className="text-right py-2 px-3 text-green-600">{item.month_in}</td>
                <td className="text-right py-2 px-3 text-orange-500">{item.month_out}</td>
                <td className="text-right py-2 px-3 text-red-500">{item.defect}</td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => { setEditId(item.id); setEditData({ ...item }) }} className="text-blue-500 hover:text-blue-700 text-xs">編輯</button>
                  <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Logs Tab ─── */
function LogsTab({ logs, product, reload }) {
  const [dateFilter, setDateFilter] = useState('')

  const filtered = dateFilter
    ? logs.filter(l => l.logged_at.startsWith(dateFilter))
    : logs

  async function exportCSV() {
    const res = await apiFetch(`/api/export/csv/${product.id}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${product.name}_logs.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">進出貨記錄</h2>
        <div className="flex gap-3">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
          {dateFilter && <button onClick={() => setDateFilter('')} className="text-gray-400 text-sm">清除</button>}
          <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">⬇ 匯出 CSV</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">時間</th>
              <th className="text-left py-3 px-3">零件</th>
              <th className="text-left py-3 px-3">SKU</th>
              <th className="text-left py-3 px-3">動作</th>
              <th className="text-right py-3 px-3">數量</th>
              <th className="text-right py-3 px-3">不良</th>
              <th className="text-left py-3 px-3">備註</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">無記錄</td></tr>
            )}
            {filtered.map(log => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 text-gray-500 text-xs">{log.logged_at?.slice(0, 16).replace('T', ' ')}</td>
                <td className="py-2 px-3">{log.part_name || '-'}</td>
                <td className="py-2 px-3">
                  {log.sku_color && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{log.sku_color}</span>}
                </td>
                <td className="py-2 px-3">
                  <ActionBadge type={log.action_type} />
                </td>
                <td className="text-right py-2 px-3 font-medium">{log.qty}</td>
                <td className="text-right py-2 px-3 text-red-500">{log.defect_qty || 0}</td>
                <td className="py-2 px-3 text-gray-400 text-xs">{log.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Settings Tab ─── */
function SettingsTab({ products, tokens, reload, reloadTokens }) {
  const [newProduct, setNewProduct] = useState({ name: '', description: '', order_qty: '', order_date: '' })
  const [newPart, setNewPart] = useState({ product_id: '', name: '' })
  const [newToken, setNewToken] = useState({ product_id: '', label: '' })
  const [lastToken, setLastToken] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [editForm, setEditForm] = useState({})

  async function createProduct() {
    if (!newProduct.name) return alert('請填寫產品名稱')
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(newProduct) })
    setNewProduct({ name: '', description: '', order_qty: '', order_date: '' })
    reload()
  }

  async function createPart() {
    if (!newPart.product_id || !newPart.name) return alert('請選擇產品並填寫零件名稱')
    await apiFetch('/api/parts', { method: 'POST', body: JSON.stringify(newPart) })
    setNewPart(p => ({ ...p, name: '' }))
    reload()
  }

  async function generateToken() {
    if (!newToken.product_id) return alert('請選擇產品')
    const res = await apiFetch('/api/designer-tokens', { method: 'POST', body: JSON.stringify(newToken) })
    const data = await res.json()
    setLastToken(`${window.location.origin}/brand/${data.token}`)
    setNewToken({ product_id: '', label: '' })
    reloadTokens()
  }

  async function deleteToken(id) {
    if (!confirm('確認刪除此設計師連結？')) return
    await apiFetch(`/api/designer-tokens/${id}`, { method: 'DELETE' })
    reloadTokens()
  }

  async function saveEditProduct() {
    await apiFetch(`/api/products/${editProduct}`, { method: 'PUT', body: JSON.stringify(editForm) })
    setEditProduct(null)
    reload()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">系統設定</h2>

      {/* Add Product */}
      <Section title="新增產品">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="產品名稱 *" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="描述" value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} />
          <input type="number" className="border rounded px-3 py-2 text-sm" placeholder="訂單數量" value={newProduct.order_qty} onChange={e => setNewProduct(p => ({ ...p, order_qty: e.target.value }))} />
          <input type="date" className="border rounded px-3 py-2 text-sm" value={newProduct.order_date} onChange={e => setNewProduct(p => ({ ...p, order_date: e.target.value }))} />
        </div>
        <button onClick={createProduct} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">新增產品</button>
      </Section>

      {/* Edit Products */}
      <Section title="產品列表">
        <div className="space-y-2">
          {products.map(p => editProduct === p.id ? (
            <div key={p.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <input className="border rounded px-2 py-1.5 text-sm" value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="名稱" />
              <input className="border rounded px-2 py-1.5 text-sm" value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="描述" />
              <input type="number" className="border rounded px-2 py-1.5 text-sm" value={editForm.order_qty || ''} onChange={e => setEditForm(f => ({ ...f, order_qty: +e.target.value }))} placeholder="訂單量" />
              <input type="date" className="border rounded px-2 py-1.5 text-sm" value={editForm.estimated_completion || ''} onChange={e => setEditForm(f => ({ ...f, estimated_completion: e.target.value }))} placeholder="預計完成" />
              <div className="col-span-2 md:col-span-4 flex gap-2">
                <button onClick={saveEditProduct} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm">儲存</button>
                <button onClick={() => setEditProduct(null)} className="text-gray-400 text-sm">取消</button>
              </div>
            </div>
          ) : (
            <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <div>
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-400 text-xs ml-2">{p.description}</span>
              </div>
              <button onClick={() => { setEditProduct(p.id); setEditForm({ ...p }) }} className="text-blue-500 hover:text-blue-700 text-sm">編輯</button>
            </div>
          ))}
        </div>
      </Section>

      {/* Add Part */}
      <Section title="新增零件">
        <div className="flex gap-3">
          <select className="border rounded px-3 py-2 text-sm" value={newPart.product_id} onChange={e => setNewPart(p => ({ ...p, product_id: e.target.value }))}>
            <option value="">選擇產品</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="零件名稱" value={newPart.name} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} />
          <button onClick={createPart} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">新增零件</button>
        </div>
      </Section>

      {/* Designer Tokens */}
      <Section title="設計師連結管理">
        <div className="flex gap-3 flex-wrap">
          <select className="border rounded px-3 py-2 text-sm" value={newToken.product_id} onChange={e => setNewToken(t => ({ ...t, product_id: e.target.value }))}>
            <option value="">選擇產品</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="標籤（如：設計師姓名）" value={newToken.label} onChange={e => setNewToken(t => ({ ...t, label: e.target.value }))} />
          <button onClick={generateToken} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">產生連結</button>
        </div>
        {lastToken && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-600 mb-1">已產生連結（點擊複製）：</p>
            <button
              className="text-sm text-purple-800 font-mono break-all hover:underline"
              onClick={() => { navigator.clipboard.writeText(lastToken); alert('已複製！') }}
            >{lastToken}</button>
          </div>
        )}
        <div className="mt-4 space-y-2">
          {tokens.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <div>
                <span className="font-medium text-sm">{t.product_name}</span>
                {t.label && <span className="text-gray-500 text-xs ml-2">({t.label})</span>}
                <div className="text-xs text-gray-400 font-mono">/brand/{t.token.slice(0, 16)}…</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/brand/${t.token}`); alert('已複製！') }}
                  className="text-blue-500 text-xs hover:text-blue-700"
                >複製</button>
                <button onClick={() => deleteToken(t.id)} className="text-red-400 text-xs hover:text-red-600">刪除</button>
              </div>
            </div>
          ))}
          {tokens.length === 0 && <p className="text-gray-400 text-sm">尚無設計師連結</p>}
        </div>
      </Section>
    </div>
  )
}

/* ─── Helpers ─── */
function StatCard({ label, value, color, icon }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  }
  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-70">{label}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function ActionBadge({ type }) {
  const styles = {
    receive: 'bg-green-100 text-green-700',
    send:    'bg-orange-100 text-orange-700',
    return:  'bg-blue-100 text-blue-700',
    ship:    'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {ACTION_LABELS[type] || type}
    </span>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-6xl mb-4">📦</div>
      <p className="text-lg">尚無產品資料</p>
      <p className="text-sm mt-1">請先執行 <code className="bg-gray-100 px-2 py-0.5 rounded">npm run seed</code> 或前往設定新增產品</p>
      <button onClick={onAdd} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700">前往設定</button>
    </div>
  )
}

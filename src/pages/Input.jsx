import { useState, useEffect } from 'react'

const ACTION_MAP = {
  receive: { label: '進貨',     emoji: '📦', color: 'bg-green-500 hover:bg-green-600',   badge: 'bg-green-100 text-green-700' },
  send:    { label: '送出加工', emoji: '🚛', color: 'bg-orange-500 hover:bg-orange-600', badge: 'bg-orange-100 text-orange-700' },
  return:  { label: '回廠',     emoji: '🔄', color: 'bg-blue-500 hover:bg-blue-600',     badge: 'bg-blue-100 text-blue-700' },
  ship:    { label: '大貨出貨', emoji: '🚢', color: 'bg-purple-500 hover:bg-purple-600', badge: 'bg-purple-100 text-purple-700' },
}

const STEPS = ['選動作', '選產品與零件', '輸入數量', '確認送出']

export default function Input() {
  const [step, setStep] = useState(1)
  const [action, setAction] = useState(null)
  const [products, setProducts] = useState([])
  const [selProduct, setSelProduct] = useState(null)
  const [partsData, setPartsData] = useState([])
  const [selPart, setSelPart] = useState(null)
  const [selSku, setSelSku] = useState('')
  const [qty, setQty] = useState('')
  const [defectQty, setDefectQty] = useState('')
  const [showDefect, setShowDefect] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [todayLogs, setTodayLogs] = useState([])
  const [lastPartId, setLastPartId] = useState(null)

  useEffect(() => { loadProducts(); loadTodayLogs() }, [])

  async function loadProducts() {
    const res = await fetch('/api/products')
    setProducts(await res.json())
  }

  async function loadParts(pid) {
    const res = await fetch(`/api/products/${pid}/parts`)
    setPartsData(await res.json())
  }

  async function loadTodayLogs() {
    const today = new Date().toISOString().slice(0, 10)
    const res = await fetch(`/api/receive-logs?date=${today}&limit=50`)
    setTodayLogs(await res.json())
  }

  function selectProduct(product) {
    setSelProduct(product)
    setSelPart(null)
    setSelSku('')
    loadParts(product.id)
  }

  function selectPart(part) {
    setSelPart(part)
    setSelSku('')
  }

  function canGoStep3() {
    return action && selProduct && selPart && (selPart.skus.length === 0 || selSku)
  }

  async function submit() {
    if (!qty || isNaN(+qty) || +qty <= 0) return alert('請輸入正確數量')
    setSubmitting(true)
    try {
      await fetch('/api/receive-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selProduct.id,
          part_id: selPart?.id,
          sku_color: selSku || '',
          action_type: action,
          qty: +qty,
          defect_qty: showDefect && defectQty ? +defectQty : 0,
          note
        })
      })
      setLastPartId(selPart?.id || null)
      setDone(true)
      loadTodayLogs()
    } catch (e) {
      alert('送出失敗：' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
    setStep(1); setAction(null); setSelProduct(null); setSelPart(null)
    setSelSku(''); setQty(''); setDefectQty(''); setShowDefect(false); setNote(''); setDone(false)
  }

  function continueSamePart() {
    setQty(''); setDefectQty(''); setShowDefect(false); setNote(''); setDone(false); setStep(3)
  }

  if (done) {
    return (
      <DoneScreen
        action={action}
        selProduct={selProduct}
        selPart={selPart}
        selSku={selSku}
        qty={qty}
        defectQty={showDefect ? defectQty : 0}
        onContinue={continueSamePart}
        onNew={resetAll}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">工廠登記</h1>
          <p className="text-gray-400 text-xs">工人操作介面</p>
        </div>
        <a href="/login" className="text-gray-400 text-xs hover:text-white">老闆後台 →</a>
      </div>

      {/* Step Indicator */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => {
            const n = i + 1
            const active = step === n
            const done = step > n
            return (
              <div key={n} className="flex items-center gap-2 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  done ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-gray-600'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs ${active ? 'text-white' : 'text-gray-500'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-600" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-6">
        {step === 1 && (
          <Step1 onSelect={a => { setAction(a); setStep(2) }} />
        )}
        {step === 2 && (
          <Step2
            products={products}
            selProduct={selProduct}
            partsData={partsData}
            selPart={selPart}
            selSku={selSku}
            onSelectProduct={selectProduct}
            onSelectPart={selectPart}
            onSelectSku={setSelSku}
            onBack={() => setStep(1)}
            onNext={() => { if (canGoStep3()) setStep(3) }}
            canNext={canGoStep3()}
            action={action}
          />
        )}
        {step === 3 && (
          <Step3
            qty={qty}
            defectQty={defectQty}
            showDefect={showDefect}
            note={note}
            onQtyChange={setQty}
            onDefectChange={setDefectQty}
            onDefectToggle={setShowDefect}
            onNoteChange={setNote}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            action={action}
            selPart={selPart}
            selSku={selSku}
          />
        )}
        {step === 4 && (
          <Step4
            action={action}
            selProduct={selProduct}
            selPart={selPart}
            selSku={selSku}
            qty={qty}
            defectQty={showDefect ? defectQty : 0}
            showDefect={showDefect}
            note={note}
            onBack={() => setStep(3)}
            onSubmit={submit}
            submitting={submitting}
          />
        )}
      </div>

      {/* Today's Logs */}
      <TodayLogs logs={todayLogs} />
    </div>
  )
}

/* ─── Step 1: Select Action ─── */
function Step1({ onSelect }) {
  return (
    <div className="p-4">
      <h2 className="text-center text-gray-300 mb-6 text-lg">選擇動作</h2>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {Object.entries(ACTION_MAP).map(([key, { label, emoji, color }]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`${color} rounded-2xl py-8 flex flex-col items-center gap-3 active:scale-95 transition-transform shadow-lg`}
          >
            <span className="text-5xl">{emoji}</span>
            <span className="text-xl font-bold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 2: Select Product / Part / SKU ─── */
function Step2({ products, selProduct, partsData, selPart, selSku, onSelectProduct, onSelectPart, onSelectSku, onBack, onNext, canNext, action }) {
  const act = ACTION_MAP[action]
  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-3 py-1 rounded-full ${act?.badge}`}>{act?.emoji} {act?.label}</span>
        <button onClick={onBack} className="text-gray-400 text-sm ml-auto">← 返回</button>
      </div>

      {/* Products */}
      <div>
        <h3 className="text-gray-400 text-sm mb-2">選擇產品</h3>
        <div className="flex flex-wrap gap-2">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProduct(p)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                selProduct?.id === p.id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >{p.name}</button>
          ))}
        </div>
      </div>

      {/* Parts */}
      {selProduct && (
        <div>
          <h3 className="text-gray-400 text-sm mb-2">選擇零件</h3>
          <div className="flex flex-wrap gap-2">
            {partsData.map(part => (
              <button
                key={part.id}
                onClick={() => onSelectPart(part)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  selPart?.id === part.id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >{part.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* SKU Colors */}
      {selPart && selPart.skus.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-sm mb-2">選擇顏色 / SKU</h3>
          <div className="flex flex-wrap gap-2">
            {selPart.skus.map(sku => (
              <button
                key={sku.id}
                onClick={() => onSelectSku(sku.color_name)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${
                  selSku === sku.color_name
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >{sku.color_name}</button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!canNext}
        className={`w-full py-4 rounded-2xl text-lg font-bold mt-4 transition ${
          canNext ? 'bg-blue-500 hover:bg-blue-600 active:scale-95' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        下一步 →
      </button>
    </div>
  )
}

/* ─── Step 3: Quantity Input ─── */
function Step3({ qty, defectQty, showDefect, note, onQtyChange, onDefectChange, onDefectToggle, onNoteChange, onBack, onNext, action, selPart, selSku }) {
  const act = ACTION_MAP[action]

  function pad(val, digit) {
    if (digit === 'del') return val.slice(0, -1)
    if (digit === '00') return val + '00'
    return val + digit
  }

  const numKeys = ['1','2','3','4','5','6','7','8','9','00','0','del']
  const [activeField, setActiveField] = useState('qty')

  function handleKey(k) {
    if (activeField === 'qty') onQtyChange(pad(qty, k))
    else onDefectChange(pad(defectQty, k))
  }

  return (
    <div className="p-4 space-y-4 max-w-sm mx-auto">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-3 py-1 rounded-full ${act?.badge}`}>{act?.emoji} {act?.label}</span>
        <span className="text-gray-400 text-xs">｜{selPart?.name}{selSku && ` · ${selSku}`}</span>
        <button onClick={onBack} className="text-gray-400 text-sm ml-auto">← 返回</button>
      </div>

      {/* Quantity Display */}
      <div
        onClick={() => setActiveField('qty')}
        className={`bg-gray-800 rounded-2xl p-4 cursor-pointer border-2 ${activeField === 'qty' ? 'border-blue-500' : 'border-gray-700'}`}
      >
        <div className="text-gray-400 text-sm mb-1">數量</div>
        <div className="text-5xl font-bold text-center min-h-[3rem]">{qty || '0'}</div>
      </div>

      {/* Defect Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">不良品</span>
        <button
          onClick={() => onDefectToggle(!showDefect)}
          className={`relative w-12 h-6 rounded-full transition-colors ${showDefect ? 'bg-red-500' : 'bg-gray-600'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showDefect ? 'left-7' : 'left-1'}`} />
        </button>
      </div>
      {showDefect && (
        <div
          onClick={() => setActiveField('defect')}
          className={`bg-gray-800 rounded-2xl p-4 cursor-pointer border-2 ${activeField === 'defect' ? 'border-red-500' : 'border-gray-700'}`}
        >
          <div className="text-red-400 text-sm mb-1">不良品數量</div>
          <div className="text-4xl font-bold text-center text-red-400 min-h-[2.5rem]">{defectQty || '0'}</div>
        </div>
      )}

      {/* Note */}
      <input
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        placeholder="備註（選填）"
        value={note}
        onChange={e => onNoteChange(e.target.value)}
      />

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-2">
        {numKeys.map(k => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            className={`py-4 rounded-xl text-xl font-bold transition active:scale-95 ${
              k === 'del' ? 'bg-red-900 text-red-300 hover:bg-red-800' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!qty || qty === '0'}
        className="w-full py-4 rounded-2xl text-lg font-bold bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed active:scale-95 transition"
      >
        確認核對 →
      </button>
    </div>
  )
}

/* ─── Step 4: Confirm ─── */
function Step4({ action, selProduct, selPart, selSku, qty, defectQty, showDefect, note, onBack, onSubmit, submitting }) {
  const act = ACTION_MAP[action]
  return (
    <div className="p-4 max-w-sm mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">確認送出</h2>
        <button onClick={onBack} className="text-gray-400 text-sm">← 返回</button>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
        <ConfirmRow label="動作" value={<span className={`text-sm px-3 py-1 rounded-full ${act?.badge}`}>{act?.emoji} {act?.label}</span>} />
        <ConfirmRow label="產品" value={selProduct?.name} />
        <ConfirmRow label="零件" value={selPart?.name} />
        {selSku && <ConfirmRow label="顏色 / SKU" value={<span className="bg-gray-700 px-3 py-0.5 rounded-full text-sm">{selSku}</span>} />}
        <hr className="border-gray-700" />
        <ConfirmRow label="數量" value={<span className="text-3xl font-bold text-blue-400">{qty}</span>} />
        {showDefect && defectQty && +defectQty > 0 && (
          <ConfirmRow label="不良品" value={<span className="text-2xl font-bold text-red-400">{defectQty}</span>} />
        )}
        {note && <ConfirmRow label="備註" value={<span className="text-gray-300 text-sm">{note}</span>} />}
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full py-5 rounded-2xl text-xl font-bold bg-green-500 hover:bg-green-600 active:scale-95 transition disabled:opacity-60 shadow-lg shadow-green-500/30"
      >
        {submitting ? '送出中...' : '✓ 確認送出'}
      </button>
    </div>
  )
}

function ConfirmRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">{label}</span>
      <span>{value}</span>
    </div>
  )
}

/* ─── Done Screen ─── */
function DoneScreen({ action, selProduct, selPart, selSku, qty, defectQty, onContinue, onNew }) {
  const act = ACTION_MAP[action]
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="text-7xl mb-6">✅</div>
      <h2 className="text-2xl font-bold mb-2">登記完成！</h2>
      <div className="text-gray-400 text-center mb-1">
        {act?.emoji} {act?.label} · {selProduct?.name} · {selPart?.name}
      </div>
      {selSku && <div className="text-gray-400 text-sm mb-1">{selSku}</div>}
      <div className="text-3xl font-bold text-blue-400 mb-1">{qty} 件</div>
      {defectQty > 0 && <div className="text-red-400 text-sm mb-4">不良品：{defectQty} 件</div>}

      <div className="mt-8 w-full max-w-xs space-y-3">
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl text-lg font-bold bg-blue-500 hover:bg-blue-600 active:scale-95 transition"
        >
          相同零件繼續登記
        </button>
        <button
          onClick={onNew}
          className="w-full py-4 rounded-2xl text-lg font-bold bg-gray-700 hover:bg-gray-600 active:scale-95 transition"
        >
          全新登記
        </button>
      </div>
    </div>
  )
}

/* ─── Today's Logs ─── */
function TodayLogs({ logs }) {
  const [open, setOpen] = useState(false)
  if (logs.length === 0) return null

  return (
    <div className="border-t border-gray-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left text-sm text-gray-400 hover:text-white flex items-center justify-between"
      >
        <span>今日登記紀錄 ({logs.length} 筆)</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto bg-gray-800">
          {logs.map(log => {
            const act = ACTION_MAP[log.action_type]
            return (
              <div key={log.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-700 text-sm">
                <span>{act?.emoji}</span>
                <span className="text-gray-300">{log.part_name || '-'}</span>
                {log.sku_color && <span className="text-gray-500 text-xs bg-gray-700 px-2 py-0.5 rounded-full">{log.sku_color}</span>}
                <span className="ml-auto font-bold text-blue-400">{log.qty}</span>
                {log.defect_qty > 0 && <span className="text-red-400 text-xs">-{log.defect_qty}不良</span>}
                <span className="text-gray-600 text-xs">{log.logged_at?.slice(11, 16)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

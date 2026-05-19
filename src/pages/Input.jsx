import { useState, useEffect } from 'react'

// ─── Shared logic (mirrored in Dashboard) ─────────────────────
export const ACTION_LABEL = {
  receive: '進貨（原料）',
  return:  '進貨（回廠）',
  send:    '出貨（送加工）',
  ship:    '出貨（大貨）',
  rework:  '重工',
  scrap:   '報廢',
}

export function resolveActionType(direction, source) {
  if (direction === 'in') return source === 'raw' ? 'receive' : 'return'
  return source === 'ship' ? 'ship' : 'send'
}

export function resolveStageId(stages, source, actionType) {
  if (!source || actionType === 'receive' || actionType === 'ship') return null
  const byFactory = stages.filter(s => s.factory_name === source)
  if (actionType === 'return') {
    return byFactory.find(s => (s.in_transit || 0) > 0)?.id ?? null
  }
  if (actionType === 'send') {
    return [...byFactory].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0]?.id ?? null
  }
  return null
}

function uniqueFactories(stages) {
  const seen = new Set()
  const out = []
  for (const s of stages) {
    if (!seen.has(s.factory_name)) { seen.add(s.factory_name); out.push(s.factory_name) }
  }
  return out
}

// ─── Icons ────────────────────────────────────────────────────
const IcoIn = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21l-8-4.5v-9l8-4.5l8 4.5v4.5"/><path d="M12 12l8-4.5M12 12v9M12 12l-8-4.5M22 18h-7M18 15l-3 3 3 3"/>
  </svg>
)
const IcoOut = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    <path d="M5 17h-2v-11a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5"/>
  </svg>
)
const IcoRefresh = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
)
const IcoTrash = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)
const IcoCheck = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ─── ProductCard ──────────────────────────────────────────────
function ProductCard({ product, active, color, onClick }) {
  const [imgSrc, setImgSrc] = useState(null)
  useEffect(() => {
    const stored = localStorage.getItem(`prod-img-${product.id}`)
    if (stored) setImgSrc(stored)
  }, [product.id])

  const initials = product.name?.slice(0, 2) || '?'
  const borderStyle = active ? `2px solid ${color}` : '0.5px solid #E8E6E0'

  return (
    <div onClick={onClick} style={{
      border: borderStyle, borderRadius: 10, overflow: 'hidden',
      cursor: 'pointer', height: 100, background: '#fff',
      position: 'relative', transition: 'border-color .12s',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = '#B0ADA8' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#E8E6E0' }}>
      {/* Image area */}
      <div style={{ height: 60, background: imgSrc ? '#000' : '#E8461A', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
        {imgSrc
          ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{initials}</span>
        }
      </div>
      {/* Name */}
      <div style={{ padding: '6px 10px', fontSize: 13, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {product.name}
      </div>
      {/* Check badge */}
      {active && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', color }}>
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
            <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Pill ─────────────────────────────────────────────────────
function Pill({ active, onClick, color, children, big }) {
  return (
    <button onClick={onClick} style={{
      border: `1.5px solid ${active ? color : '#E8E6E0'}`,
      background: active ? color : '#fff',
      color: active ? '#fff' : '#1A1A1A',
      padding: big ? '13px 18px' : '9px 14px',
      borderRadius: 999, cursor: 'pointer',
      fontSize: big ? 16 : 14, fontWeight: active ? 600 : 500,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      transition: 'all .12s', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

// ─── SKU dot ─────────────────────────────────────────────────
const SKU_PAL = { '黑':'#1a1a1a','白':'#e8e8e8','鈦':'#5a5550','銀':'#c8c6c0','橘':'#E8461A','藍':'#1A5FAD','硬膜橘':'#E8461A','硬膜鐵灰':'#3a3f48','硬膜銀':'#c8ccd1' }
function SkuDot({ name, size=14 }) {
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:SKU_PAL[name]||'#999', flexShrink:0, border:'1px solid rgba(0,0,0,0.1)' }} />
}

// ─── Step bar ─────────────────────────────────────────────────
function StepBar({ step }) {
  const labels = ['選動作', '選零件', '輸入數量']
  const num = { action:1, picks:2, qty:3, confirm:3, done:0 }[step] || 1
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 20px', background:'var(--bg-1)', borderBottom:'1px solid var(--line-1)' }}>
      {labels.map((l, i) => {
        const done = i+1 < num, active = i+1 === num
        return (
          <div key={i} style={{ display:'contents' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:13, display:'grid', placeItems:'center', fontWeight:700, fontSize:12,
                background: done ? '#2E7D32' : active ? '#E64A19' : 'transparent',
                color: done||active ? '#fff' : '#C9C7C0',
                border:`1.5px solid ${done?'#2E7D32':active?'#E64A19':'#EBEBEB'}` }}>
                {done ? <IcoCheck /> : i+1}
              </div>
              <span style={{ fontSize:12, fontWeight:active?600:400, color:active?'#1A1A1A':'#A8A6A0' }}>{l}</span>
            </div>
            {i < 2 && <div style={{ flex:1, height:1, background:done?'#2E7D32':'#EBEBEB' }} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Keypad ───────────────────────────────────────────────────
function Keypad({ value, onChange, accent }) {
  const keys = ['7','8','9','4','5','6','1','2','3','00','0','⌫']
  function press(k) {
    if (k === '⌫') { onChange(value.slice(0,-1)); return }
    if (value.length >= 6) return
    onChange((value === '0' ? '' : value) + k)
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
      {keys.map(k => (
        <button key={k} onClick={() => press(k)} style={{
          height:60, fontSize:24, fontFamily:'var(--font-mono)', fontWeight:600,
          border:'0.5px solid #EBEBEB', background:k==='⌫'?'#F8F8F6':'#fff',
          color:k==='⌫'?accent:'#1A1A1A', borderRadius:8, cursor:'pointer',
        }}
        onMouseDown={e => e.currentTarget.style.background='#F0EFE8'}
        onMouseUp={e => e.currentTarget.style.background=k==='⌫'?'#F8F8F6':'#fff'}
        onMouseLeave={e => e.currentTarget.style.background=k==='⌫'?'#F8F8F6':'#fff'}>
          {k}
        </button>
      ))}
    </div>
  )
}

function SHead({ children }) {
  return <div style={{ fontSize:12, color:'#888', fontWeight:500, letterSpacing:'0.05em', marginBottom:10 }}>{children}</div>
}
function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0' }}>
      <div style={{ flex:1, height:1, background:'#EBEBEB' }} />
      <span style={{ fontSize:11, color:'#A8A6A0', whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:'#EBEBEB' }} />
    </div>
  )
}

// ─── Fixed bottom nav ─────────────────────────────────────────
function BottomBar({ onBack, onNext, nextLabel='下一步 →', nextColor, disabled }) {
  return (
    <div style={{ position:'fixed', left:0, right:0, bottom:0, padding:16, background:'var(--bg-0)', borderTop:'1px solid var(--line-1)', display:'flex', gap:10 }}>
      {onBack && <button onClick={onBack} className="btn" style={{ padding:'14px 20px', fontSize:15, flexShrink:0 }}>← 上一步</button>}
      <button onClick={onNext} disabled={disabled} style={{
        flex:1, padding:'14px 20px', fontSize:15, fontWeight:600, borderRadius:8,
        border:`1.5px solid ${disabled?'#EBEBEB':nextColor||'#E64A19'}`,
        background:disabled?'#F8F8F6':nextColor||'#E64A19',
        color:disabled?'#A8A6A0':'#fff', cursor:disabled?'not-allowed':'pointer',
        display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
        fontFamily:'inherit',
      }}>{nextLabel}</button>
    </div>
  )
}

// ─── Step 1: Direction ────────────────────────────────────────
function StepAction({ onPick }) {
  return (
    <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14, maxWidth:480, margin:'0 auto', paddingBottom:32 }}>
      <div style={{ fontSize:13, color:'#888', fontWeight:500, marginBottom:4 }}>這筆是進貨還是出貨？</div>
      {[
        { dir:'in',  label:'進貨', sub:'東西進到倉庫', color:'#2E7D32', icon:<IcoIn /> },
        { dir:'out', label:'出貨', sub:'東西離開倉庫', color:'#E64A19', icon:<IcoOut /> },
      ].map(d => (
        <button key={d.dir} onClick={() => onPick(d.dir)} style={{
          padding:0, background:'#fff', border:'1px solid #EBEBEB', borderRadius:14,
          cursor:'pointer', overflow:'hidden', textAlign:'left',
          display:'flex', flexDirection:'column', fontFamily:'inherit', transition:'box-shadow .12s',
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
          <div style={{ height:80, background:d.color, color:'#fff', display:'grid', placeItems:'center' }}>{d.icon}</div>
          <div style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:18, fontWeight:700 }}>{d.label}</div>
            <div style={{ fontSize:13, color:'#888', marginTop:3 }}>{d.sub}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Step 2: Product / Part / SKU / Source ────────────────────
function StepPicks({ direction, products, onBack, onNext }) {
  const color = direction === 'in' ? '#2E7D32' : '#E64A19'
  const [pid, setPid] = useState(products[0]?.id ?? null)
  const [parts, setParts] = useState([])
  const [partId, setPartId] = useState(null)
  const [sku, setSku] = useState('')
  const [source, setSource] = useState(null)

  useEffect(() => {
    if (!pid) return
    fetch(`/api/products/${pid}/parts`).then(r => r.json()).then(data => {
      setParts(data)
      const first = data[0]
      setPartId(first?.id ?? null)
      setSku(first?.skus?.length === 1 ? (first.skus[0].color_name ?? '') : '')
      setSource(null)
    }).catch(() => {})
  }, [pid])

  useEffect(() => {
    const p = parts.find(p => p.id === partId)
    setSku(p?.skus?.length === 1 ? (p.skus[0].color_name ?? '') : '')
    setSource(null)
  }, [partId])

  const part = parts.find(p => p.id === partId)
  const allStages = part?.stages || []
  const factories = uniqueFactories(allStages)
  const needSku = (part?.skus?.length ?? 0) > 1
  const skuReady = !needSku || sku
  const canNext = !!(pid && partId && skuReady && source)

  function go() {
    if (!canNext) return
    onNext({
      productId: pid,
      productName: products.find(p => p.id === pid)?.name ?? '',
      partId,
      partName: part?.name ?? '',
      partStages: allStages,
      sku: sku || (part?.skus?.[0]?.color_name ?? ''),
      source,
    })
  }

  return (
    <div style={{ padding:20, paddingBottom:100, display:'flex', flexDirection:'column', gap:22 }}>
      {/* Product */}
      <div>
        <SHead>選擇產品</SHead>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 }}>
          {products.map(p => <ProductCard key={p.id} product={p} color={color} active={pid===p.id} onClick={() => setPid(p.id)} />)}
        </div>
      </div>

      {/* Part */}
      {parts.length > 0 && (
        <div>
          <SHead>選擇零件</SHead>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {parts.map(pt => <Pill key={pt.id} big color={color} active={partId===pt.id} onClick={() => setPartId(pt.id)}>{pt.name}</Pill>)}
          </div>
        </div>
      )}

      {/* SKU (only if >1) */}
      {partId && needSku && (
        <div>
          <SHead>選擇 SKU 顏色</SHead>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {part.skus.map(s => (
              <Pill key={s.id} big color={color} active={sku===s.color_name} onClick={() => setSku(s.color_name)}>
                <SkuDot name={s.color_name} size={16} />{s.color_name}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {/* Source / Destination */}
      {partId && skuReady && (
        <div>
          <SHead>{direction==='in' ? '來源' : '去向'}</SHead>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <Divider label={direction==='in' ? '── 新原料 ──' : '── 出給客戶 ──'} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              <Pill big color={color}
                active={source==='raw'||source==='ship'}
                onClick={() => setSource(direction==='in' ? 'raw' : 'ship')}>
                {direction==='in' ? '原料廠（新原料）' : '大貨出貨（給客戶）'}
              </Pill>
            </div>
            {factories.length > 0 && (
              <>
                <Divider label={direction==='in' ? '── 加工回廠 ──' : '── 送去加工 ──'} />
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {factories.map(f => (
                    <Pill key={f} big color={color} active={source===f} onClick={() => setSource(f)}>
                      {f}（{direction==='in' ? '加工回廠' : '送去加工'}）
                    </Pill>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomBar onBack={onBack} onNext={go} nextColor={color} disabled={!canNext} />
    </div>
  )
}

// ─── Step 3: Qty + defect handling ───────────────────────────
function StepQty({ direction, picks, onBack, onNext }) {
  const color = direction === 'in' ? '#2E7D32' : '#E64A19'
  const [qty, setQty] = useState('')
  const [hasDefect, setHasDefect] = useState(false)
  const [defect, setDefect] = useState('')
  const [handling, setHandling] = useState(null) // 'rework'|'scrap'|null
  const [reworkStageId, setReworkStageId] = useState(null)
  const [reworkStageName, setReworkStageName] = useState(null)

  const defectNum = hasDefect ? (parseInt(defect)||0) : 0
  const showHandling = direction === 'in' && hasDefect && defectNum > 0
  const reworkStages = (picks.partStages || []).filter(s => (s.in_transit||0) > 0)
  const canNext = !!(qty && parseInt(qty)>0) && (handling !== 'rework' || reworkStageId)

  function go() {
    if (!canNext) return
    onNext({ qty:parseInt(qty), defectQty:defectNum, handling: showHandling ? handling : null, reworkStageId, reworkStageName })
  }

  return (
    <div style={{ padding:20, paddingBottom:100, display:'flex', flexDirection:'column', gap:14 }}>
      {/* Context bar */}
      <div style={{ background:'#fff', border:'0.5px solid #EBEBEB', borderRadius:10, padding:'9px 14px', fontSize:13, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
        <span style={{ padding:'2px 8px', borderRadius:4, background:color, color:'#fff', fontSize:12, fontWeight:600 }}>
          {direction==='in'?'進貨':'出貨'}
        </span>
        <span style={{ color:'#C9C7C0' }}>·</span>
        <b>{picks.productName}</b>
        <span style={{ color:'#C9C7C0' }}>·</span>
        <span>{picks.partName}</span>
        {picks.sku && <><span style={{ color:'#C9C7C0' }}>·</span><span>{picks.sku}</span></>}
        <span style={{ color:'#C9C7C0' }}>·</span>
        <span style={{ color:'#888' }}>{picks.source==='raw'?'原料廠':picks.source==='ship'?'大貨出貨':picks.source}</span>
      </div>

      {/* Qty */}
      <div style={{ background:'#fff', border:'0.5px solid #EBEBEB', borderRadius:12, padding:'16px 20px' }}>
        <div style={{ fontSize:12, color:'#888', marginBottom:4, fontWeight:500 }}>數量</div>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, height:60, marginBottom:12 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:54, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1, color:qty?'#1A1A1A':'#C9C7C0' }}>
            {qty||'0'}
          </div>
          <span style={{ fontSize:16, color:'#888' }}>件</span>
        </div>
        <Keypad value={qty} onChange={setQty} accent={color} />
      </div>

      {/* Defect toggle (進貨 only) */}
      {direction === 'in' && (
        <div style={{ background:'#fff', border:'0.5px solid #EBEBEB', borderRadius:12, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600 }}>有不良品</div>
              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>需要記錄不良品數量時開啟</div>
            </div>
            <button onClick={() => { setHasDefect(v => !v); setDefect(''); setHandling(null); setReworkStageId(null) }} style={{
              width:52, height:30, borderRadius:15, border:'none', cursor:'pointer', padding:0,
              background:hasDefect?'#E8461A':'#EBEBEB', position:'relative', transition:'background .15s',
            }}>
              <div style={{ position:'absolute', top:3, left:hasDefect?25:3, width:24, height:24, borderRadius:12, background:'#fff', transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
            </button>
          </div>
          {hasDefect && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #EBEBEB' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:4, fontWeight:500 }}>不良品數量</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8, height:50, marginBottom:10 }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:42, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1, color:defect?'#E8461A':'#C9C7C0' }}>
                  {defect||'0'}
                </div>
                <span style={{ fontSize:14, color:'#888' }}>件不良</span>
              </div>
              <Keypad value={defect} onChange={v => { setDefect(v); setHandling(null); setReworkStageId(null) }} accent="#E8461A" />
            </div>
          )}
        </div>
      )}

      {/* Defect handling */}
      {showHandling && (
        <div style={{ background:'#FAEEDA', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>這 {defectNum} 件不良品要怎麼處理？</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button onClick={() => { setHandling(handling==='rework'?null:'rework'); setReworkStageId(null) }} style={{
              background:handling==='rework'?'#FEF3CD':'#fff',
              border:`1.5px solid ${handling==='rework'?'#FAC775':'#F0D9A0'}`,
              borderRadius:10, padding:'12px 14px', cursor:'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, textAlign:'left',
            }}>
              <span style={{ color:'#B07D00' }}><IcoRefresh /></span>
              <span style={{ fontSize:14, fontWeight:500 }}>重工</span>
              <span style={{ fontSize:11, color:'#B07D00' }}>送回加工廠重做</span>
            </button>
            <button onClick={() => { setHandling(handling==='scrap'?null:'scrap'); setReworkStageId(null) }} style={{
              background:handling==='scrap'?'#FCEBEB':'#fff',
              border:`1.5px solid ${handling==='scrap'?'#F09595':'#F5D0D0'}`,
              borderRadius:10, padding:'12px 14px', cursor:'pointer', fontFamily:'inherit',
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, textAlign:'left',
            }}>
              <span style={{ color:'#791F1F' }}><IcoTrash /></span>
              <span style={{ fontSize:14, fontWeight:500 }}>報廢</span>
              <span style={{ fontSize:11, color:'#791F1F' }}>直接廢棄不處理</span>
            </button>
          </div>

          {handling === 'rework' && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #F0D9A0' }}>
              <div style={{ fontSize:12, color:'#666', marginBottom:8, fontWeight:500 }}>送回哪個加工站？</div>
              {reworkStages.length === 0
                ? <span style={{ fontSize:12, color:'#A8A6A0' }}>目前無加工中數量的加工站</span>
                : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {reworkStages.map(s => (
                      <button key={s.id} onClick={() => { setReworkStageId(s.id); setReworkStageName(`${s.factory_name}・${s.action_name}`) }} style={{
                        padding:'8px 14px', borderRadius:999, cursor:'pointer', fontFamily:'inherit',
                        border:`1.5px solid ${reworkStageId===s.id?'#B07D00':'#F0D9A0'}`,
                        background:reworkStageId===s.id?'#FEF3CD':'#fff',
                        color:reworkStageId===s.id?'#7A5A00':'#555',
                        fontSize:13, fontWeight:reworkStageId===s.id?600:400,
                      }}>
                        {s.factory_name}・{s.action_name}
                        <span style={{ fontSize:11, opacity:0.7, marginLeft:4 }}>({s.in_transit})</span>
                      </button>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {!handling && (
            <div style={{ marginTop:10, fontSize:12, color:'#888', fontStyle:'italic' }}>暫不處理，待主管確認</div>
          )}
        </div>
      )}

      <BottomBar onBack={onBack} onNext={go} nextLabel="預覽確認 →" nextColor={color} disabled={!canNext} />
    </div>
  )
}

// ─── Confirm page ─────────────────────────────────────────────
function StepConfirm({ direction, picks, qtyData, worker, onBack, onSubmit, submitting }) {
  const color = direction === 'in' ? '#2E7D32' : '#E64A19'
  const actionType = resolveActionType(direction, picks.source)
  const { qty, defectQty, handling, reworkStageName } = qtyData

  const defectDesc = handling === 'rework' ? `重工（${reworkStageName||'—'}）`
    : handling === 'scrap' ? '報廢'
    : defectQty > 0 ? '待主管確認' : null

  const rows = [
    { l:'動作',              v: ACTION_LABEL[actionType] },
    { l:'產品',              v: picks.productName },
    { l:'零件',              v: picks.partName },
    ...(picks.sku           ? [{ l:'SKU',    v: picks.sku }] : []),
    { l: direction==='in'?'來源':'去向',
      v: picks.source==='raw'?'原料廠（新原料）': picks.source==='ship'?'大貨出貨（給客戶）': picks.source },
    { l:'數量',              v: `${qty.toLocaleString()} 件` },
    ...(defectQty > 0       ? [{ l:'不良品', v:`${defectQty} 件`, red:true }] : []),
    ...(defectDesc          ? [{ l:'不良品處理', v:defectDesc }] : []),
    ...(worker              ? [{ l:'登記人', v:worker.name }] : []),
  ]

  return (
    <div style={{ padding:20, paddingBottom:100, display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ fontSize:16, fontWeight:700 }}>確認內容</div>
      <div style={{ background:'#fff', border:'0.5px solid #EBEBEB', borderRadius:14, padding:'0 18px' }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:i<rows.length-1?'1px solid #F5F4F0':'none' }}>
            <span style={{ fontSize:12, color:'#888', letterSpacing:'0.04em' }}>{row.l}</span>
            <span style={{ fontSize:15, fontWeight:500, color:row.red?'#E8461A':'#1A1A1A' }}>{row.v}</span>
          </div>
        ))}
      </div>
      <BottomBar
        onBack={onBack}
        onNext={onSubmit}
        nextLabel={submitting ? '送出中...' : '確認送出'}
        nextColor={color}
        disabled={submitting}
      />
    </div>
  )
}

// ─── Done page ────────────────────────────────────────────────
function StepDone({ direction, picks, qtyData, onSame, onNew }) {
  const color = direction === 'in' ? '#2E7D32' : '#E64A19'
  const actionType = resolveActionType(direction, picks.source)
  const { qty, defectQty, handling, reworkStageName } = qtyData
  const hasPending = defectQty > 0 && !handling

  return (
    <div style={{ padding:20, paddingBottom:100, display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ textAlign:'center', padding:'24px 0 8px' }}>
        <div style={{ width:64, height:64, borderRadius:32, background:color, display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize:20, fontWeight:700 }}>登記完成</div>
        <div style={{ fontSize:12, color:'#888', marginTop:4 }}>
          {new Date().toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
        </div>
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #EBEBEB', borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontSize:14, fontWeight:600 }}>{picks.productName}・{picks.partName}{picks.sku?`・${picks.sku}`:''}</div>
        <div style={{ fontSize:13, color:'#555' }}>{ACTION_LABEL[actionType]} {qty.toLocaleString()} 件</div>
        {defectQty > 0 && (
          <div style={{ fontSize:13, color:'#E8461A' }}>
            不良品 {defectQty} 件 →{' '}
            {handling==='rework' ? `重工（${reworkStageName||'—'}）`
             :handling==='scrap' ? '報廢'
             :'待主管確認'}
          </div>
        )}
        {hasPending && (
          <div style={{ marginTop:6, padding:'6px 10px', background:'#FEF6F0', borderRadius:6, fontSize:12, color:'#C84B00' }}>
            {defectQty} 件不良品已記錄，待主管確認
          </div>
        )}
      </div>

      <div style={{ position:'fixed', left:0, right:0, bottom:0, padding:16, background:'var(--bg-0)', borderTop:'1px solid var(--line-1)', display:'flex', gap:10 }}>
        <button onClick={onSame} className="btn" style={{ flex:1, padding:'14px 18px', fontSize:14, justifyContent:'center' }}>相同零件繼續</button>
        <button onClick={onNew} style={{
          flex:1, padding:'14px 18px', fontSize:14, fontWeight:600,
          background:color, border:`1.5px solid ${color}`, color:'#fff',
          borderRadius:8, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit',
        }}>新登記</button>
      </div>
    </div>
  )
}

// ─── Worker header & picker ───────────────────────────────────

// ─── Main ─────────────────────────────────────────────────────
export default function Input() {
  const [step, setStep] = useState('action')
  const [direction, setDirection] = useState(null)
  const [picks, setPicks] = useState(null)
  const [qtyData, setQtyData] = useState(null)
  const [products, setProducts] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {})
  }, [])

  function reset() { setStep('action'); setDirection(null); setPicks(null); setQtyData(null) }
  function sameAgain() { setQtyData(null); setStep('qty') }

  async function handleSubmit() {
    if (!picks || !qtyData) return
    const actionType = resolveActionType(direction, picks.source)
    const stageId = resolveStageId(picks.partStages, picks.source, actionType)
    setSubmitting(true)
    try {
      const base = { product_id:picks.productId, part_id:picks.partId, sku_color:picks.sku, worker_id:null }

      // Main log
      await fetch('/api/receive-logs', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...base, stage_id:stageId, action_type:actionType, qty:qtyData.qty, defect_qty:qtyData.defectQty||0 }) })

      // Immediate rework of defects
      if (qtyData.handling === 'rework' && qtyData.reworkStageId) {
        await fetch('/api/receive-logs', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ ...base, stage_id:qtyData.reworkStageId, action_type:'rework', qty:qtyData.defectQty, defect_qty:0 }) })
      }

      // Immediate scrap of defects
      if (qtyData.handling === 'scrap' && qtyData.defectQty > 0) {
        await fetch('/api/receive-logs', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ ...base, stage_id:stageId, action_type:'scrap', qty:qtyData.defectQty, defect_qty:0 }) })
      }

      setStep('done')
    } catch (e) { alert('送出失敗：' + e.message) }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg-0)', position:'relative' }}>
      <div style={{ padding:'13px 20px', display:'flex', alignItems:'center', background:'var(--bg-1)', borderBottom:'1px solid var(--line-1)' }}>
        <img src="/dicas-logo.svg" alt="DiCAS" style={{ height:26, width:'auto' }} />
        <span style={{ fontSize:14, fontWeight:700, marginLeft:10 }}>進出貨登記</span>
      </div>
      {step !== 'done' && <StepBar step={step} />}
      <div style={{ flex:1, overflow:'auto' }}>
        {step === 'action' && <StepAction onPick={dir => { setDirection(dir); setStep('picks') }} />}
        {step === 'picks' && direction && (
          <StepPicks direction={direction} products={products}
            onBack={() => setStep('action')}
            onNext={p => { setPicks(p); setStep('qty') }} />
        )}
        {step === 'qty' && picks && (
          <StepQty direction={direction} picks={picks}
            onBack={() => setStep('picks')}
            onNext={d => { setQtyData(d); setStep('confirm') }} />
        )}
        {step === 'confirm' && picks && qtyData && (
          <StepConfirm direction={direction} picks={picks} qtyData={qtyData} worker={null}
            onBack={() => setStep('qty')} onSubmit={handleSubmit} submitting={submitting} />
        )}
        {step === 'done' && picks && qtyData && (
          <StepDone direction={direction} picks={picks} qtyData={qtyData}
            onSame={sameAgain} onNew={reset} />
        )}
      </div>
    </div>
  )
}

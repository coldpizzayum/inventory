const NUM_STYLE = { fontSize: 16, fontWeight: 500 }

function Stat({ value, label, color, breakdown }) {
  return (
    <div>
      <div className="num" style={{ ...NUM_STYLE, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
      {breakdown && breakdown.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2, maxWidth: 160 }}>
          {breakdown.map(b => `${b.variant_name} ${b.quantity}`).join('・')}
        </div>
      )}
    </div>
  )
}

export default function ProductStats({ mode, warehouseQty, inProcessQty, defectQty, variantStock }) {
  const isManagement = mode === 'management'
  const showDefect = isManagement && (defectQty || 0) > 0
  return (
    <div style={{ display: 'flex', gap: isManagement ? 20 : 12 }}>
      <Stat value={warehouseQty || 0} label="成品庫存" breakdown={variantStock} />
      {isManagement && <Stat value={inProcessQty || 0} label="加工中數量" color="var(--info)" />}
      {showDefect && <Stat value={defectQty} label="待處理不良" color="var(--accent)" />}
    </div>
  )
}

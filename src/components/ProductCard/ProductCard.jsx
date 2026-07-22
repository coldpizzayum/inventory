import { IconX, IconAdjustmentsHorizontal } from '@tabler/icons-react'
import ProductThumbnail from './ProductThumbnail.jsx'
import ProductTitle from './ProductTitle.jsx'
import ProductStats from './ProductStats.jsx'
import ProductActions from './ProductActions.jsx'

const CARD_STYLE = {
  background: 'var(--bg-1)',
  border: '1px solid var(--line-1)',
  borderRadius: 'var(--r-lg)',
  overflow: 'hidden',
}

const DIVIDER = '1px solid var(--line-1)'

export default function ProductCard({
  product,
  mode,
  onGoToProcess,
  onGoToParts,
  onGoToOrders,
  onEdit,
  onDelete,
  onManualCorrect,
  children,
}) {
  const isManagement = mode === 'management'
  const warehouseQty = product.warehouse_total || 0
  const inProcessQty = product.in_transit_total || 0
  const defectQty = product.defect_total || 0
  const variantStock = product.variant_stock || []

  if (!isManagement) {
    return (
      <div
        style={{ ...CARD_STYLE, cursor: 'pointer', transition: 'border-color .15s' }}
        onClick={onGoToProcess}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-1)' }}
      >
        <ProductThumbnail mode={mode} productId={product.id} />

        <div style={{ padding: '10px 12px' }}>
          <ProductTitle mode={mode} name={product.name} />
          <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 16 }}>
            {product.description || ''}
          </div>
          <ProductStats mode={mode} warehouseQty={warehouseQty} inProcessQty={inProcessQty} variantStock={variantStock} />
        </div>

        <div style={{ padding: '7px 12px', borderTop: DIVIDER }} onClick={e => e.stopPropagation()}>
          <ProductActions onGoToProcess={onGoToProcess} onGoToParts={onGoToParts} onGoToOrders={onGoToOrders} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...CARD_STYLE, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Thumbnail + title */}
      <div style={{ display: 'flex', gap: 14 }}>
        <ProductThumbnail
          mode={mode}
          productId={product.id}
          brandColor={product.brand_color}
          initials={product.initials || product.name?.slice(0, 2)}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <ProductTitle mode={mode} name={product.name} onEdit={onEdit} />
            <button
              onClick={onDelete}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 2, flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--bad)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)' }}
            >
              <IconX size={14} stroke={1.6} />
            </button>
          </div>
          {product.description && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{product.description}</div>}
        </div>
      </div>

      {/* Stats + manual correction */}
      <div style={{ padding: '10px 0', borderTop: DIVIDER }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <ProductStats mode={mode} warehouseQty={warehouseQty} inProcessQty={inProcessQty} defectQty={defectQty} variantStock={variantStock} />
          <button
            onClick={onManualCorrect}
            title="手動修正成品庫存"
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
            <IconAdjustmentsHorizontal size={13} stroke={1.7} />手動修正
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ borderTop: DIVIDER, paddingTop: 10 }}>
        <ProductActions onGoToProcess={onGoToProcess} onGoToParts={onGoToParts} onGoToOrders={onGoToOrders} />
      </div>

      {children}
    </div>
  )
}

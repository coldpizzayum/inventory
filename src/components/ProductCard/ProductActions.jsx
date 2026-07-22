import { IconArrowGuide, IconPuzzle, IconClipboardList } from '@tabler/icons-react'

export default function ProductActions({ onGoToProcess, onGoToParts, onGoToOrders }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }} onClick={onGoToProcess}>
        <IconArrowGuide size={16} stroke={1.6} />加工流程
      </button>
      <button className="btn" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }} onClick={onGoToParts}>
        <IconPuzzle size={16} stroke={1.6} />零件庫存
      </button>
      <button className="btn" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }} onClick={onGoToOrders}>
        <IconClipboardList size={16} stroke={1.6} />訂單
      </button>
    </div>
  )
}

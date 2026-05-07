import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const STATUS_CONFIG = {
  '等待中':  { color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400',   icon: '⏳' },
  '送加工廠': { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', icon: '📤' },
  '加工中':  { color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500',   icon: '⚙️' },
  '包裝中':  { color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', icon: '📦' },
  '完成':    { color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  icon: '✅' },
}

const STATUS_ORDER = ['等待中', '送加工廠', '加工中', '包裝中', '完成']

export default function Brand() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-700">連結無效</h1>
          <p className="text-gray-400 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  const { product, label, parts } = data
  const overallStatus = deriveOverallStatus(parts)
  const statusCfg = STATUS_CONFIG[overallStatus] || STATUS_CONFIG['等待中']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">品牌設計師視圖</div>
            <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
            <p className="text-sm text-gray-500">{product.description}</p>
          </div>
          {label && (
            <div className="text-right">
              <div className="text-xs text-gray-400">設計師</div>
              <div className="font-medium text-gray-700">{label}</div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">整體進度</h2>
            <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${statusCfg.color}`}>
              <span>{statusCfg.icon}</span>
              {overallStatus}
            </span>
          </div>

          {/* Status Timeline */}
          <div className="flex items-center gap-0 mt-4">
            {STATUS_ORDER.filter(s => s !== '等待中').map((s, i, arr) => {
              const currentIdx = STATUS_ORDER.indexOf(overallStatus)
              const thisIdx = STATUS_ORDER.indexOf(s)
              const isReached = currentIdx >= thisIdx
              const cfg = STATUS_CONFIG[s]
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isReached ? cfg.color + ' border-2 border-current' : 'bg-gray-100 text-gray-300'}`}>
                      {isReached ? cfg.icon : (i + 1)}
                    </div>
                    <div className={`text-xs mt-1 whitespace-nowrap ${isReached ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{s}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded ${isReached && currentIdx > thisIdx ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Order Info */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-400">訂單日期</div>
              <div className="font-medium text-gray-700">{product.order_date || '-'}</div>
            </div>
            <div>
              <div className="text-gray-400">預計完成</div>
              <div className={`font-medium ${product.estimated_completion ? 'text-blue-600' : 'text-gray-400'}`}>
                {product.estimated_completion || '待確認'}
              </div>
            </div>
          </div>
        </div>

        {/* Parts Status */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 px-1">各零件狀態</h2>
          {parts.map(part => {
            const cfg = STATUS_CONFIG[part.status] || STATUS_CONFIG['等待中']
            const hasDefectAlert = part.defect_alert === '有異常'
            return (
              <div key={part.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{part.name}</h3>
                    {hasDefectAlert && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1">
                        ⚠ 品質異常
                      </span>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${cfg.color}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {part.status}
                  </span>
                </div>

                {/* SKU Progress */}
                {part.sku_progress.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mb-2">SKU / 顏色進度</div>
                    <div className="flex flex-wrap gap-2">
                      {part.sku_progress.map((sku, i) => {
                        const skuCfg = STATUS_CONFIG[sku.status] || STATUS_CONFIG['等待中']
                        return (
                          <div key={i} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${skuCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${skuCfg.dot}`} />
                            <span className="font-medium">{sku.color_name}</span>
                            <span className="opacity-75">{sku.status}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">此頁面為唯讀視圖 · 僅顯示被指派產品的加工狀態</p>
      </div>
    </div>
  )
}

function deriveOverallStatus(parts) {
  if (!parts || parts.length === 0) return '等待中'
  const statusValues = parts.map(p => STATUS_ORDER.indexOf(p.status))
  const minIdx = Math.min(...statusValues)
  return STATUS_ORDER[minIdx] || '等待中'
}

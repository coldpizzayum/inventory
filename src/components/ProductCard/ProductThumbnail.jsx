import { useEffect, useRef, useState } from 'react'
import { IconPhoto, IconUpload } from '@tabler/icons-react'

const MAX_DIMENSION = 800

function readCachedImage(productId) {
  return localStorage.getItem(`prod-img-${productId}`)
}

function resizeAndCache(productId, file, onDone) {
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = e => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const data = canvas.toDataURL('image/jpeg', 0.75)
      try {
        localStorage.setItem(`prod-img-${productId}`, data)
        onDone(data)
      } catch {
        alert('圖片儲存失敗：瀏覽器儲存空間不足，請先清除其他產品圖片後再試。')
      }
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// Read-only, full-bleed thumbnail used by mode="dashboard".
function DashboardThumbnail({ productId }) {
  const [src, setSrc] = useState(null)
  useEffect(() => { setSrc(readCachedImage(productId)) }, [productId])

  return (
    <div style={{ height: 80, background: 'var(--bg-2)', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
      {src
        ? <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <IconPhoto size={22} stroke={1.5} color="var(--line-3)" />
      }
    </div>
  )
}

// Clickable, upload-on-click/drop square avatar used by mode="management".
function ManagementThumbnail({ productId, brandColor, initials }) {
  const [src, setSrc] = useState(null)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setSrc(readCachedImage(productId)) }, [productId])

  function handleFile(file) {
    resizeAndCache(productId, file, setSrc)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      onDragOver={e => e.preventDefault()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 80, height: 80, flexShrink: 0, borderRadius: 8,
        overflow: 'hidden', position: 'relative',
        background: src ? 'transparent' : (brandColor || 'var(--accent)'),
        cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}
    >
      {src
        ? <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', pointerEvents: 'none' }}>{initials}</span>
      }
      {hover && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', gap: 2,
        }}>
          <IconUpload size={16} stroke={1.8} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>上傳圖片</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}

export default function ProductThumbnail({ mode, productId, brandColor, initials }) {
  return mode === 'management'
    ? <ManagementThumbnail productId={productId} brandColor={brandColor} initials={initials} />
    : <DashboardThumbnail productId={productId} />
}

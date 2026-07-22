import { useEffect, useState } from 'react'
import { IconPencil } from '@tabler/icons-react'

const TITLE_STYLE = { fontSize: 15, fontWeight: 600 }

export default function ProductTitle({ mode, name, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  useEffect(() => { if (!editing) setValue(name) }, [name, editing])

  if (mode !== 'management') {
    return (
      <div style={{ ...TITLE_STYLE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
    )
  }

  function commit() {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onEdit?.(trimmed)
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="input"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setEditing(false); setValue(name) }
        }}
        style={{ ...TITLE_STYLE, padding: '2px 6px', flex: 1 }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
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
      <span style={{ ...TITLE_STYLE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      <span className="edit-hint" style={{ opacity: 0, transition: 'opacity .15s', color: 'var(--text-4)', display: 'flex', flexShrink: 0 }}>
        <IconPencil size={13} stroke={1.8} />
      </span>
    </div>
  )
}

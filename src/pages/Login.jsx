import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // 只記住帳號，不記住密碼——密碼交給瀏覽器原生的密碼管理器處理
  // （見下方 input 的 autoComplete 屬性），避免把明文密碼存在 localStorage。
  useEffect(() => {
    const savedAccount = localStorage.getItem('remembered_account')
    if (savedAccount) {
      setUsername(savedAccount)
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember: rememberMe })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登入失敗')
      localStorage.setItem('token', data.token)
      if (rememberMe) {
        localStorage.setItem('remembered_account', username)
      } else {
        localStorage.removeItem('remembered_account')
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/dicas-logo.svg" alt="Dicas" className="h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">益成金屬庫存管理系統</h1>
          <p className="text-gray-500 text-sm mt-1">管理後台登入</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              autoComplete={rememberMe ? 'current-password' : 'off'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#666',
            cursor: 'pointer',
            margin: '4px 0 12px'
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            記住我
          </label>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#E8461A',
              border: 'none', color: '#fff', borderRadius: 8, padding: 12,
              fontSize: 15, fontWeight: 500, width: '100%',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'background .15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#CC3D17' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#E8461A' }}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
          <a href="/input" className="block text-sm text-gray-500 hover:text-blue-600">→ 工作人員入口 /input</a>
        </div>
      </div>
    </div>
  )
}

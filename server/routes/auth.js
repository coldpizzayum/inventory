import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (
      username === (process.env.ADMIN_USER || 'admin') &&
      password === (process.env.ADMIN_PASS || 'admin123')
    ) {
      const secret = process.env.JWT_SECRET
      if (!secret) return res.status(500).json({ error: '伺服器未設定 JWT_SECRET 環境變數' })
      const token = jwt.sign({ username, role: 'admin' }, secret, { expiresIn: '24h' })
      res.json({ token })
    } else {
      res.status(401).json({ error: '帳號或密碼錯誤' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router

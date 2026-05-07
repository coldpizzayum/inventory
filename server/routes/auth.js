import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (
    username === (process.env.ADMIN_USER || 'admin') &&
    password === (process.env.ADMIN_PASS || 'admin123')
  ) {
    const token = jwt.sign({ username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' })
    res.json({ token })
  } else {
    res.status(401).json({ error: '帳號或密碼錯誤' })
  }
})

export default router

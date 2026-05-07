import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Input from './pages/Input.jsx'
import Brand from './pages/Brand.jsx'
import Login from './pages/Login.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/input" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/input" element={<Input />} />
        <Route path="/brand/:token" element={<Brand />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

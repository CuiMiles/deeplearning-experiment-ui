import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import ListPage from './pages/ListPage'
import DetailPage from './pages/DetailPage'
import ComparePage from './pages/ComparePage'
import IdeasPage from './pages/IdeasPage'
import LensesPage from './pages/LensesPage'
import ClaimsPage from './pages/ClaimsPage'
import TemplatesPage from './pages/TemplatesPage'

function ScrollTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // 例如 #/exp/xxx#insights：等页面渲染后滚动到对应区块
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 80)
      return () => clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <Layout>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/exp/:id" element={<DetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/lenses" element={<LensesPage />} />
        <Route path="/claims" element={<ClaimsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="*" element={<ListPage />} />
      </Routes>
    </Layout>
  )
}

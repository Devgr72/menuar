import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MenuARPage from './pages/MenuARPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main AR experience: /ar/:restaurantSlug?table=:tableId */}
        <Route path="/ar/:restaurantSlug" element={<MenuARPage />} />
        {/* Demo fallback — no slug, uses mock data */}
        <Route path="/ar" element={<MenuARPage />} />
        {/* Root redirect to demo */}
        <Route path="/" element={<Navigate to="/ar" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

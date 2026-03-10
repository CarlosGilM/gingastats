import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Confronto from './pages/Confronto';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/confronto/:id" element={<Confronto />} />
      </Routes>
    </BrowserRouter>
  );
}

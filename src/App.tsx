// 导入路由组件和 Link
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './components/MainLayout'; // 导入我们创建的布局组件

// 导入你的页面
import Home from './pages/home/Home';
import About from './pages/about/About';
import Canvas from "./pages/canvas/Canvas";

function App() {
  return (
    <BrowserRouter>
      {/* 路由展示区 */}
      <MainLayout>
        {/* Routes 负责匹配当前 URL 对应的 Route */}
        <Routes>
          {/* 首页路由 */}
          <Route path="/" element={<Home />} />

          {/* About 页面路由 */}
          <Route path="/about" element={<About />} />

          {/* Canvas 页面路由 */}
          <Route path="/canvas/:roomId" element={<Canvas />} />

          {/* 可选: 404 页面 */}
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App

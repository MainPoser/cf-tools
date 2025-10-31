// 导入路由组件和 Link
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from './components/MainLayout'; // 导入我们创建的布局组件

// 导入你的页面
import Home from './pages/home/Home';
import About from './pages/about/About';
import Base64Tool from './pages/tools/Base64Tool';
import ConfigFormatter from './pages/tools/ConfigFormatter';
import URLCodec from './pages/tools/URLCodec';
import Timestamp from './pages/tools/Timestamp';  
import QRCodeGenerator from './pages/tools/QRCodeGenerator';
import ColorPicker from './pages/tools/ColorPicker';
import Markdown from './pages/tools/Markdown';

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

          {/* 工具页面路由 - 现在只添加Base64 */}
          <Route path="/tools/base64" element={<Base64Tool />} />
          <Route path="/tools/config-formatter" element={<ConfigFormatter />} />
          <Route path="/tools/url-codec" element={<URLCodec />} />
          <Route path="/tools/timestamp" element={<Timestamp />} />
           <Route path="/tools/qr-code-generator" element={<QRCodeGenerator />} />
           <Route path="/tools/color-picker" element={<ColorPicker />} />
           <Route path="/tools/markdown" element={<Markdown />} />
          {/* 可选: 404 页面 */}
          <Route path="*" element={<h2>404 Not Found</h2>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App
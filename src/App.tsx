// 导入路由组件和 Link
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';


// 导入你的页面
import Home from './pages/home/Home';
import About from './pages/about/About';

function App() {


  return (
    <>
      <BrowserRouter>
        {/* 导航栏 */}
        <nav style={{ borderBottom: '1px solid #ccc', padding: '10px' }}>
          {/* 使用 Link 实现客户端跳转，避免页面刷新 */}
          <Link to="/" style={{ marginRight: '15px' }}>Home</Link>
          <Link to="/about">About</Link>
        </nav>

        {/* 路由展示区 */}
        <div style={{ padding: '20px' }}>
          {/* Routes 负责匹配当前 URL 对应的 Route */}
          <Routes>
            {/* 首页路由 */}
            <Route path="/" element={<Home />} />

            {/* About 页面路由 */}
            <Route path="/about" element={<About />} />

            {/* 可选: 404 页面 */}
            <Route path="*" element={<h2>404 Not Found</h2>} />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  )
}

export default App

// 必须在任何 Ant Design 组件或 React 组件导入之前执行（修复antd5不支持react19问题）
import '@ant-design/v5-patch-for-react-19';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

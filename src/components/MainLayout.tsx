import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { UserOutlined, CoffeeOutlined, PictureOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import './MainLayout.css';

const { Header, Content, Footer, Sider } = Layout;

// 定义侧边栏菜单项
const items = [
    { key: '/', icon: <UserOutlined />, label: <Link to="/">首页</Link> },
    { key: '/canvas/default', icon: <CoffeeOutlined />, label: <Link to="/canvas/default">共享画布</Link> },
    { key: '/about', icon: <PictureOutlined />, label: <Link to="/about">关于</Link> },
];

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation(); // 获取当前路由信息

    // 获取当前激活的菜单项
    const selectedKey = items.find(item => item.key === location.pathname)?.key || '/';

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <Layout className="main-layout" style={{ minHeight: '100vh' }}>
            {/* 侧边栏 */}
            <Sider
                className="sidebar"
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
            >
                {/* 新的 Logo 容器 */}
                <div className={`logo-container ${collapsed ? 'collapsed' : ''}`}>
                    <img
                        src="/vite.svg"
                        alt="App Logo"
                        className="logo-img"
                    />

                    {/* 只有在侧边栏展开时才显示文字 */}
                    {!collapsed && (
                        <span className="logo-text">
                            CF-TOOLS
                        </span>
                    )}
                </div>
                <Menu
                    className="sidebar-menu"
                    theme="dark"
                    defaultSelectedKeys={[selectedKey]}
                    selectedKeys={[selectedKey]} // 确保菜单与路由同步
                    mode="inline"
                    items={items}
                />
            </Sider>

            <Layout className="main-content-layout">
                {/* 顶部导航 */}
                <Header 
                    className="main-header"
                    style={{ background: colorBgContainer }}
                >
                    <div className="header-content">
                        Cloudflare React 应用
                    </div>
                </Header>

                {/* 主内容区域 */}
                <Content className="main-content">
                    <div
                        className="content-container"
                        style={{
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                        }}
                    >
                        {/* 路由页面内容将显示在这里 */}
                        {children}
                    </div>
                </Content>

                {/* 页脚 */}
                <Footer className="main-footer">
                    Cloudflare App Created with Ant Design ©{new Date().getFullYear()}
                </Footer>
            </Layout>
        </Layout>
    );
};
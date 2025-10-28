import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { UserOutlined, CoffeeOutlined, PictureOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

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
        <Layout style={{ minHeight: '100vh' }}>
            {/* 侧边栏 */}
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
            >
                {/* 新的 Logo 容器 */}
                <div
                    style={{
                        height: 32,
                        margin: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start', // 折叠时居中
                        overflow: 'hidden', // 防止图片溢出
                    }}
                >
                    <img
                        src="/vite.svg"
                        alt="App Logo"
                        // Logo 图片的基本样式
                        style={{
                            height: 32, // 图片高度
                            width: 32,  // 图片宽度
                            marginRight: collapsed ? 0 : 8, // 折叠时去掉右侧边距
                            objectFit: 'contain', // 确保图片不变形
                        }}
                    />

                    {/* 只有在侧边栏展开时才显示文字 */}
                    {!collapsed && (
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                            CF-TOOLS
                        </span>
                    )}
                </div>
                <Menu
                    theme="dark"
                    defaultSelectedKeys={[selectedKey]}
                    selectedKeys={[selectedKey]} // 确保菜单与路由同步
                    mode="inline"
                    items={items}
                />
            </Sider>

            <Layout>
                {/* 顶部导航 */}
                <Header style={{ padding: 0, background: colorBgContainer }}>
                    <div style={{ padding: '0 24px', fontSize: '18px' }}>
                        Cloudflare React 应用
                    </div>
                </Header>

                {/* 主内容区域 */}
                <Content style={{ margin: '24px 16px' }}>
                    <div
                        style={{
                            padding: 24,
                            minHeight: '80vh', // 设置最小高度以保证内容填充
                            background: colorBgContainer,
                            borderRadius: borderRadiusLG,
                        }}
                    >
                        {/* 路由页面内容将显示在这里 */}
                        {children}
                    </div>
                </Content>

                {/* 页脚 */}
                <Footer style={{ textAlign: 'center' }}>
                    Cloudflare App Created with Ant Design ©{new Date().getFullYear()}
                </Footer>
            </Layout>
        </Layout>
    );
};
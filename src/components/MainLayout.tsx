import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, theme, Typography } from 'antd';
import {
    UserOutlined,
    PictureOutlined,
    ToolOutlined,
    CodeOutlined,
    LinkOutlined,
    ClockCircleOutlined,
    QrcodeOutlined,
    BgColorsOutlined,
    FileTextOutlined,
    LockOutlined,
    RobotOutlined,
    TranslationOutlined,
    EditOutlined,
    DownOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import './MainLayout.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

// 可爱动漫头像组件
function CuteAvatar() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [expression, setExpression] = useState('😊');
    const avatarRef = useRef<HTMLDivElement>(null);

    // 表情数组
    const expressions = ['😊', '😄', '😍', '🥰', '😎', '🤗', '😋', '🥳', '😇', '🤭', '😴', '🤔', '😮', '🥺', '😏'];

    // 鼠标移动事件处理
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // 随机更换表情
    useEffect(() => {
        const changeExpression = () => {
            const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
            setExpression(randomExpression);
        };

        // 初始表情
        changeExpression();

        // 每4-10秒随机更换表情
        const interval = setInterval(() => {
            changeExpression();
        }, Math.random() * 6000 + 4000);

        return () => clearInterval(interval);
    }, []);

    // 计算表情看向鼠标的角度和倾斜
    const calculateExpressionTransform = () => {
        if (!avatarRef.current) return { rotate: 0, translateX: 0, translateY: 0 };

        const rect = avatarRef.current.getBoundingClientRect();
        const avatarCenterX = rect.left + rect.width / 2;
        const avatarCenterY = rect.top + rect.height / 2;

        // 计算鼠标相对于头像中心的角度
        const angle = Math.atan2(mousePosition.y - avatarCenterY, mousePosition.x - avatarCenterX);
        const distance = Math.min(Math.sqrt(Math.pow(mousePosition.x - avatarCenterX, 2) + Math.pow(mousePosition.y - avatarCenterY, 2)), 150);

        // 增大倾斜角度范围（-45度到45度）
        const rotate = Math.sin(angle) * 45;

        // 增加位移效果
        const translateX = Math.cos(angle) * distance * 0.1;
        const translateY = Math.sin(angle) * distance * 0.1;

        return { rotate, translateX, translateY };
    };

    const transform = calculateExpressionTransform();

    return (
        <div
            ref={avatarRef}
            className="cute-avatar"
            style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'box-shadow 0.3s ease',
                boxShadow: '0 4px 15px rgba(25, 84, 123, 0.3)',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 84, 123, 0.4)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(25, 84, 123, 0.3)';
            }}
        >
            {/* 表情符号 - 整体跟随鼠标 */}
            <div
                className="avatar-expression"
                style={{
                    fontSize: '22px',
                    transition: 'transform 0.1s ease-out',
                    transform: `rotate(${transform.rotate}deg) translate(${transform.translateX}px, ${transform.translateY}px)`,
                    display: 'inline-block',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                }}
            >
                {expression}
            </div>
        </div>
    );
};

// 定义顶部菜单项
const menuItems = [
    { key: '/', icon: <UserOutlined />, label: <Link to="/">首页</Link> },
    {
        key: '/tools',
        icon: <ToolOutlined />,
        label: (
            <span>
                工具集
                <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} />
            </span>
        ),
        children: [
            { key: '/tools/base64', icon: <CodeOutlined />, label: <Link to="/tools/base64">Base64编解码</Link> },
            { key: '/tools/config-formatter', icon: <CodeOutlined />, label: <Link to="/tools/config-formatter">配置格式转换</Link> },
            { key: '/tools/url-codec', icon: <LinkOutlined />, label: <Link to="/tools/url-codec">URL编解码</Link> },
            { key: '/tools/timestamp', icon: <ClockCircleOutlined />, label: <Link to="/tools/timestamp">时间戳转换</Link> },
            { key: '/tools/qr-code-generator', icon: <QrcodeOutlined />, label: <Link to="/tools/qr-code-generator">二维码生成</Link> },
            { key: '/tools/color-picker', icon: <BgColorsOutlined />, label: <Link to="/tools/color-picker">颜色选择器</Link> },
            { key: '/tools/markdown', icon: <FileTextOutlined />, label: <Link to="/tools/markdown">Markdown预览</Link> },
            { key: '/tools/password-generator', icon: <LockOutlined />, label: <Link to="/tools/password-generator">密码生成器</Link> },
        ]
    },
    {
        key: '/ai',
        icon: <RobotOutlined />,
        label: (
            <span>
                AI工具集
                <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} />
            </span>
        ),
        children: [
            { key: '/ai', icon: <RobotOutlined />, label: <Link to="/ai">AI工具总览</Link> },
            { key: '/ai/text-generation', icon: <EditOutlined />, label: <Link to="/ai/text-generation">AI文本生成</Link> },
            { key: '/ai/image-generation', icon: <PictureOutlined />, label: <Link to="/ai/image-generation">AI图像生成</Link> },
            { key: '/ai/text-translation', icon: <TranslationOutlined />, label: <Link to="/ai/text-translation">AI文本翻译</Link> },
        ]
    },
    { key: '/about', icon: <PictureOutlined />, label: <Link to="/about">关于</Link> },
];


interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const location = useLocation(); // 获取当前路由信息

    // 获取当前激活的菜单项
    const selectedKeys = [location.pathname];

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // 更新时间
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 格式化时间
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 获取问候语
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 6) return '🌙 夜深了';
        if (hour < 12) return '☀️ 早上好';
        if (hour < 14) return '🌞 中午好';
        if (hour < 18) return '🌅 下午好';
        return '🌆 晚上好';
    };

    return (
        <Layout className="main-layout" style={{ minHeight: '100vh' }}>
            {/* 顶部导航栏 */}
            <Header
                className="top-header"
                style={{
                    background: colorBgContainer,
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '48px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000
                }}
            >
                {/* 左侧：Logo 和品牌 */}
                <div className="header-left">
                    <div className="brand-section">
                        <img
                            src="/icon.png"
                            alt="App Logo"
                            className="brand-logo"
                        />
                        <div className="brand-info">
                            <Text strong className="brand-title">CF-TOOLS</Text>
                            <Text className="brand-subtitle">实用工具集合</Text>
                        </div>
                    </div>
                </div>

                {/* 中间：导航菜单 */}
                <div className="header-center">
                    <Menu
                        className="top-menu"
                        mode="horizontal"
                        selectedKeys={selectedKeys}
                        items={menuItems}
                        style={{
                            border: 'none',
                            background: 'transparent'
                        }}
                    />
                </div>

                {/* 右侧：头像和时间信息 */}
                <div className="header-right">
                    <div className="interaction-section">
                        {/* 可爱动漫头像 */}
                        <CuteAvatar />

                        {/* 问候语和时间 */}
                        <div className="time-section">
                            <Text className="greeting-text">
                                {getGreeting()}
                            </Text>
                            <Text className="time-text">
                                {formatTime(currentTime)}
                            </Text>
                        </div>
                    </div>
                </div>
            </Header>

            {/* 主内容区域 */}
            <Content className="main-content">
                <div
                    className="content-container"
                    style={{
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        margin: '24px',
                        padding: '24px',
                        minHeight: 'calc(100vh - 48px - 70px)'
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
    );
}
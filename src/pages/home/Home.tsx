import { Card, Row, Col, Typography, Space, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    CodeOutlined,
    LinkOutlined,
    ClockCircleOutlined,
    QrcodeOutlined,
    BgColorsOutlined,
    FileTextOutlined,
    LockOutlined,
    EyeOutlined,
    RobotOutlined,
    EditOutlined,
    PictureOutlined,
    TranslationOutlined,
    ApiOutlined,
    ThunderboltOutlined,
    CalculatorOutlined,
    SwapOutlined
} from '@ant-design/icons';
import { theme } from 'antd';
import { useSiteStats } from '../../hooks/useAnalytics';
import './Home.css';

const { Title, Paragraph } = Typography;

function Home() {
    const navigate = useNavigate();
    const { token: { colorBgContainer } } = theme.useToken();
    const { stats: siteStats, loading: statsLoading } = useSiteStats();

    // 开发者工具集
    const devTools = [
        {
            title: 'Base64编解码',
            description: '快速进行Base64编码和解码操作',
            icon: <CodeOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
            path: '/tools/base64',
            available: true
        },
        {
            title: '配置格式转换',
            description: '格式化&验证&转换配置文件',
            icon: <CodeOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
            path: '/tools/config-formatter',
            available: true
        },
        {
            title: 'URL编解码',
            description: 'URL编码和解码工具',
            icon: <LinkOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
            path: '/tools/url-codec',
            available: true
        },
        {
            title: '时间戳转换',
            description: '时间戳与日期格式互转',
            icon: <ClockCircleOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />,
            path: '/tools/timestamp',
            available: true
        },
        {
            title: '二维码生成',
            description: '生成各种内容的二维码',
            icon: <QrcodeOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
            path: '/tools/qr-code-generator',
            available: true
        },
        {
            title: '颜色选择器',
            description: '颜色选择和格式转换',
            icon: <BgColorsOutlined style={{ fontSize: '24px', color: '#fa541c' }} />,
            path: '/tools/color-picker',
            available: true
        },
        {
            title: 'Markdown预览',
            description: '实时预览Markdown文档',
            icon: <FileTextOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />,
            path: '/tools/markdown',
            available: true
        },
        {
            title: '密码生成器',
            description: '生成安全的随机密码',
            icon: <LockOutlined style={{ fontSize: '24px', color: '#f5222d' }} />,
            path: '/tools/password-generator',
            available: true
        },
        {
            title: 'IP计算器',
            description: '网络IP地址和子网掩码计算工具',
            icon: <CalculatorOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
            path: '/tools/ip-calculator',
            available: true
        },
        {
            title: 'P2P文件直传',
            description: '无流量、高速、点对点文件传输',
            icon: <SwapOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />,
            path: '/tools/file-transfer',
            available: true
        }
    ];

    // AI工具集
    const aiTools = [
        {
            title: 'AI工具总览',
            description: '探索各种AI智能工具',
            icon: <RobotOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
            path: '/ai',
            available: true
        },
        {
            title: 'AI文本生成',
            description: '智能生成各类文本内容',
            icon: <EditOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
            path: '/ai/text-generation',
            available: true
        },
        {
            title: 'AI图像生成',
            description: '基于描述生成精美图像',
            icon: <PictureOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
            path: '/ai/image-generation',
            available: true
        },
        {
            title: 'AI文本翻译',
            description: '多语言智能翻译服务',
            icon: <TranslationOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
            path: '/ai/text-translation',
            available: true
        }
    ];

    // 获取工具的访问统计
    const getToolStats = (toolTitle: string) => {
        if (statsLoading || !siteStats.tools) {
            return { totalVisits: 0, todayVisits: 0 };
        }
        return siteStats.tools[toolTitle] || { totalVisits: 0, todayVisits: 0 };
    };

    // 渲染工具卡片
    const renderToolCard = (tool: any, index: number) => {
        const toolStats = getToolStats(tool.title);
        return (
            <Col xs={24} sm={12} md={8} lg={6} xl={4} xxl={3} key={index}>
                <Card
                    hoverable={tool.available}
                    style={{
                        height: '150px',
                        textAlign: 'center',
                        opacity: tool.available ? 1 : 0.6,
                        cursor: tool.available ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        maxWidth: '280px'
                    }}
                    styles={{
                        body: {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%',
                            padding: '12px'
                        }
                    }}
                    onClick={() => tool.available && navigate(tool.path)}
                >
                    <div>
                        <div style={{ marginBottom: '8px' }}>
                            {tool.icon}
                        </div>
                        <Title level={5} style={{ margin: '4px 0', fontSize: '14px' }}>
                            {tool.title}
                            {!tool.available && <span style={{ color: '#999', fontSize: '10px', marginLeft: '4px' }}> (开发中)</span>}
                        </Title>
                        <Paragraph style={{ margin: 0, color: '#666', fontSize: '11px' }}>
                            {tool.description}
                        </Paragraph>
                    </div>

                    {/* 访问统计信息 */}
                    {tool.available && !statsLoading && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                            <Space size="small" style={{ fontSize: '10px', color: '#999' }}>
                                <span>总: {toolStats.totalVisits}</span>
                                <span>今: {toolStats.todayVisits}</span>
                            </Space>
                        </div>
                    )}
                </Card>
            </Col>
        );
    };

    return (
        <div className="home-container" style={{ background: colorBgContainer }}>
            <div style={{ textAlign: 'center', marginBottom: '5px' }}>
                {/* 网站总体统计信息 */}
                {!statsLoading && (
                    <div style={{ marginTop: '8px' }}>
                        <Space size="middle">
                            <Statistic
                                title="总访问次数"
                                value={siteStats.siteTotal}
                                prefix={<EyeOutlined />}
                                valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                                style={{ fontSize: '12px' }}
                            />
                            <Statistic
                                title="今日访问"
                                value={siteStats.siteToday}
                                prefix={<EyeOutlined />}
                                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                                style={{ fontSize: '12px' }}
                            />
                        </Space>
                    </div>
                )}
            </div>

            {/* 开发者工具集区域 */}
            <div style={{ marginBottom: '24px', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    width: '100%'
                }}>
                    <Title level={2} style={{
                        color: 'white',
                        margin: 0,
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <ApiOutlined style={{ marginRight: '8px' }} />
                        开发者工具
                    </Title>
                    <Paragraph style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '14px',
                        margin: '0 0 0 16px',
                        flex: 1
                    }}>
                        实用开发工具，提升编程效率
                    </Paragraph>
                </div>

                <div style={{
                    borderBottom: '2px solid #e8e8e8',
                    marginBottom: '16px',
                    width: '100%'
                }} />

                <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    width: '100%'
                }}>
                    <Row gutter={[16, 16]}>
                        {devTools.map((tool, index) => renderToolCard(tool, index))}
                    </Row>
                </div>
            </div>

            {/* AI工具集区域 */}
            <div style={{ marginBottom: '24px', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    width: '100%'
                }}>
                    <Title level={2} style={{
                        color: 'white',
                        margin: 0,
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <ThunderboltOutlined style={{ marginRight: '8px' }} />
                        AI 智能工具
                    </Title>
                    <Paragraph style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '14px',
                        margin: '0 0 0 16px',
                        flex: 1
                    }}>
                        人工智能赋能，创意无限可能
                    </Paragraph>
                </div>

                <div style={{
                    borderBottom: '2px solid #e8e8e8',
                    marginBottom: '16px',
                    width: '100%'
                }} />

                <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    width: '100%'
                }}>
                    <Row gutter={[16, 16]}>
                        {aiTools.map((tool, index) => renderToolCard(tool, index))}
                    </Row>
                </div>
            </div>
        </div>
    )
};

export default Home;
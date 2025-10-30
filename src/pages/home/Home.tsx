import { Card, Row, Col, Button, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
    ToolOutlined,
    CodeOutlined, 
    LinkOutlined, 
    ClockCircleOutlined, 
    QrcodeOutlined,
    BgColorsOutlined,
    FileTextOutlined,
    LockOutlined
} from '@ant-design/icons';
import { theme } from 'antd';
import './Home.css';

const { Title, Paragraph } = Typography;

function Home() {
    const navigate = useNavigate();
    const { token: { colorBgContainer } } = theme.useToken();

    const tools = [
        {
            title: 'Base64编解码',
            description: '快速进行Base64编码和解码操作',
            icon: <CodeOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
            path: '/tools/base64',
            available: true
        },
        {
            title: 'JSON格式化',
            description: '格式化和验证JSON数据',
            icon: <CodeOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
            path: '/tools/json-formatter',
            available: true
        },
        {
            title: 'URL编解码',
            description: 'URL编码和解码工具',
            icon: <LinkOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
            path: '/tools/url-encoder',
            available: false
        },
        {
            title: '时间戳转换',
            description: '时间戳与日期格式互转',
            icon: <ClockCircleOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />,
            path: '/tools/timestamp',
            available: false
        },
        {
            title: '二维码生成',
            description: '生成各种内容的二维码',
            icon: <QrcodeOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
            path: '/tools/qr-code',
            available: false
        },
        {
            title: '颜色选择器',
            description: '颜色选择和格式转换',
            icon: <BgColorsOutlined style={{ fontSize: '24px', color: '#fa541c' }} />,
            path: '/tools/color-picker',
            available: false
        },
        {
            title: 'Markdown预览',
            description: '实时预览Markdown文档',
            icon: <FileTextOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />,
            path: '/tools/markdown',
            available: false
        },
        {
            title: '密码生成器',
            description: '生成安全的随机密码',
            icon: <LockOutlined style={{ fontSize: '24px', color: '#f5222d' }} />,
            path: '/tools/password',
            available: false
        }
    ];

    return (
        <div className="home-container" style={{ background: colorBgContainer }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <Title level={1}>
                    <ToolOutlined style={{ marginRight: '12px' }} />
                    开发者工具集
                </Title>
                <Paragraph style={{ fontSize: '18px', color: '#666' }}>
                    一站式开发工具，提高你的工作效率
                </Paragraph>
            </div>

            <Row gutter={[24, 24]}>
                {tools.map((tool, index) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={index}>
                        <Card
                            hoverable={tool.available}
                            style={{ 
                                height: '180px', 
                                textAlign: 'center',
                                opacity: tool.available ? 1 : 0.6,
                                cursor: tool.available ? 'pointer' : 'not-allowed'
                            }}
                            bodyStyle={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'center',
                                height: '100%'
                            }}
                            onClick={() => tool.available && navigate(tool.path)}
                        >
                            <div style={{ marginBottom: '12px' }}>
                                {tool.icon}
                            </div>
                            <Title level={5} style={{ margin: '8px 0' }}>
                                {tool.title}
                                {!tool.available && <span style={{ color: '#999', fontSize: '12px', marginLeft: '8px' }}> (开发中)</span>}
                            </Title>
                            <Paragraph style={{ margin: 0, color: '#666', fontSize: '12px' }}>
                                {tool.description}
                            </Paragraph>
                        </Card>
                    </Col>
                ))}
            </Row>

            <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <Space>
                    <Button type="primary" size="large" onClick={() => navigate('/tools/base64')}>
                        开始使用 Base64 工具
                    </Button>
                    <Button size="large" onClick={() => navigate('/about')}>
                        关于项目
                    </Button>
                </Space>
            </div>
        </div>
    )
};

export default Home;
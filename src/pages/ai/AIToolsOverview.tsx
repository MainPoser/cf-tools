import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, message, Alert, Progress, Input } from 'antd';
import {
    RobotOutlined,
    FileTextOutlined,
    PictureOutlined,
    TranslationOutlined,
    ApiOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph, Text } = Typography;

// 使用统计接口
interface UsageStats {
    total_daily_used: number;
    total_daily_limit: number;
    total_remaining: number;
    reset_time: string;
}

export default function AIToolsOverview() {
    useAutoTrackVisit('AI工具总览');

    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [accountId, setAccountId] = useState('');
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

    // 从localStorage加载配置
    useEffect(() => {
        const savedApiKey = localStorage.getItem('cf_worker_api_key');
        const savedAccountId = localStorage.getItem('cf_account_id');

        if (savedApiKey) setApiKey(savedApiKey);
        if (savedAccountId) setAccountId(savedAccountId);
    }, []);

    // 配置了API密钥和账户ID后，获取使用统计
    useEffect(() => {
        if (apiKey && accountId) {
            fetchUsageStats();
        }
    }, [apiKey, accountId]);

    const saveConfig = () => {
        localStorage.setItem('cf_worker_api_key', apiKey);
        localStorage.setItem('cf_account_id', accountId);
        message.success('配置已保存');
        fetchUsageStats();
    };

    const fetchUsageStats = async () => {
        if (!apiKey || !accountId) {
            return;
        }
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            const totalNeuronsQuery = {
                operationName: "GetAIInferencesTotalNeurons",
                variables: {
                    accountTag: accountId,
                    dateStart: today,
                    dateEnd: today
                },
                query: `query GetAIInferencesTotalNeurons($accountTag: string, $filter: filter) {
                    viewer {
                        accounts(filter: {accountTag: $accountTag}) {
                            data: aiInferenceAdaptiveGroups(filter: {date_geq: $dateStart, date_leq: $dateEnd}, limit: 1) {
                                sum {
                                    neurons: totalNeurons
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                }`
            };

            const response = await fetch('/api/proxies/cloudflare/client/v4/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(totalNeuronsQuery)
            });

            if (!response.ok) {
                throw new Error('GraphQL请求失败');
            }

            const data = await response.json();

            let totalDailyUsed = 0;
            if (data.data?.viewer?.accounts?.[0]?.data?.[0]?.sum?.neurons) {
                totalDailyUsed = data.data.viewer.accounts[0].data[0].sum.neurons;
            }

            const totalDailyLimit = 10000;
            const totalRemaining = Math.max(0, totalDailyLimit - totalDailyUsed);

            const now = new Date();
            const tomorrowUtc = new Date(now);
            tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
            tomorrowUtc.setUTCHours(0, 0, 0, 0);
            const resetTimeLocal = tomorrowUtc.toLocaleString();

            setUsageStats({
                total_daily_used: totalDailyUsed,
                total_daily_limit: totalDailyLimit,
                total_remaining: totalRemaining,
                reset_time: resetTimeLocal
            });

        } catch (error: any) {
            console.error('获取使用统计失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const aiTools = [
        {
            title: 'AI文本生成',
            description: '使用先进的AI模型进行文本生成、对话和创作',
            icon: <FileTextOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
            path: '/ai/text-generation',
            features: ['多模型支持', '智能对话', '内容创作', '代码生成']
        },
        {
            title: 'AI图像生成',
            description: '使用Stable Diffusion等模型生成高质量图像',
            icon: <PictureOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
            path: '/ai/image-generation',
            features: ['高质量生成', '多风格支持', '快速生成', '自定义描述']
        },
        {
            title: 'AI文本翻译',
            description: '支持100+种语言的高质量AI翻译',
            icon: <TranslationOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />,
            path: '/ai/text-translation',
            features: ['多语言支持', '语境理解', '准确翻译', '实时翻译']
        }
    ];

    const usagePercentage = usageStats ? (usageStats.total_daily_used / usageStats.total_daily_limit) * 100 : 0;

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <RobotOutlined style={{ marginRight: '8px' }} />
                AI工具集
            </Title>
            <Paragraph>
                强大的AI工具集合，包含文本生成、图像创建和多语言翻译功能。基于Cloudflare Worker AI，每天免费提供10,000个神经元。
            </Paragraph>

            {/* 配置区域 */}
            <Card title="API 配置" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Title level={4}>账户 ID</Title>
                        <Input
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="请输入 Cloudflare 账户 ID"
                        />
                    </Col>
                    <Col span={8}>
                        <Title level={4}>API Token</Title>
                        <Input.Password
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="请输入 Cloudflare API Token"
                        />
                    </Col>
                    <Col span={8}>
                        <Title level={4}>&nbsp;</Title>
                        <Space>
                            <Button type="primary" onClick={saveConfig} icon={<ApiOutlined />}>
                                保存配置
                            </Button>
                            <Button onClick={fetchUsageStats} icon={<BarChartOutlined />} loading={loading}>
                                刷新统计
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {usageStats && (
                    <div style={{ marginTop: '16px' }}>
                        <Alert
                            message={`今日使用情况: ${usageStats.total_daily_used} / ${usageStats.total_daily_limit} 神经元`}
                            description={`剩余: ${usageStats.total_remaining} 神经元 | 重置时间: ${usageStats.reset_time}`}
                            type={usageStats.total_remaining > 5000 ? 'success' : usageStats.total_remaining > 1000 ? 'warning' : 'error'}
                            showIcon
                            style={{ marginBottom: '16px' }}
                        />
                        <Progress
                            percent={usagePercentage}
                            status={usagePercentage > 90 ? 'exception' : usagePercentage > 70 ? 'active' : 'normal'}
                            strokeColor={{
                                '0%': '#108ee9',
                                '100%': usagePercentage > 90 ? '#ff4d4f' : '#87d068',
                            }}
                        />
                    </div>
                )}
            </Card>

            {/* AI工具卡片 */}
            <Row gutter={[16, 16]}>
                {aiTools.map((tool, index) => (
                    <Col xs={24} sm={12} lg={8} key={index}>
                        <Card
                            hoverable
                            style={{ height: '100%' }}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                {tool.icon}
                            </div>
                            <Title level={4} style={{ textAlign: 'center', marginBottom: '8px' }}>
                                {tool.title}
                            </Title>
                            <Paragraph style={{ textAlign: 'center', color: '#666', marginBottom: '16px' }}>
                                {tool.description}
                            </Paragraph>

                            <div style={{ marginBottom: '16px' }}>
                                <Text strong>功能特性：</Text>
                                <div style={{ marginTop: '8px' }}>
                                    {tool.features.map((feature, idx) => (
                                        <div key={idx} style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                            • {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <Link to={tool.path}>
                                    <Button type="primary" size="large">
                                        开始使用
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
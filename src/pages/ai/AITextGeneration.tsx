import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Select, Alert } from 'antd';
import { SendOutlined, ClearOutlined, CopyOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

// AI文本生成模型配置
const AI_MODELS = [
    { id: '@cf/meta/llama-3.1-8b-instruct', name: 'LLaMA 3.1 8B Instruct', description: '通用对话模型，适合各种文本生成任务' },
    { id: '@cf/mistral/mistral-7b-instruct-v0.2', name: 'Mistral 7B Instruct', description: '轻量级对话模型，响应速度快' },
    { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', description: '高性能模型，适合复杂推理任务' },
];

// 单个模型使用统计
interface ModelUsageStats {
    model_id: string;
    model_name: string;
    used: number; // 该模型已使用的神经元数量
    last_used: string;
}

export default function AITextGeneration() {
    useAutoTrackVisit('AI文本生成');

    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [accountId, setAccountId] = useState('');
    const [textInput, setTextInput] = useState('');
    const [textOutput, setTextOutput] = useState('');
    const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);

    // 使用统计
    const [usageStats, setUsageStats] = useState<ModelUsageStats[] | null>(null);

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

    // 获取使用统计
    const fetchUsageStats = async () => {
        if (!apiKey || !accountId) {
            return;
        }
        setLoading(true);
        try {
            // 查询所有文本生成模型的使用情况
            const allModelIds = AI_MODELS.map(model => model.id);

            const modelUsageQuery = {
                operationName: "GetAIInferencesCostsGroupByModelsOverTime",
                variables: {
                    accountTag: accountId,
                    datetimeStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24小时前
                    datetimeEnd: new Date().toISOString(),
                    modelIds: allModelIds
                },
                query: `query GetAIInferencesCostsGroupByModelsOverTime($accountTag: string!, $datetimeStart: Time, $datetimeEnd: Time, $modelIds: [string]) {
                    viewer {
                        accounts(filter: {accountTag: $accountTag}) {
                            aiInferenceAdaptiveGroups(filter: {datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd, modelId_in: $modelIds, neurons_geq: 0, costMetricValue1_geq: 0, costMetricValue2_geq: 0}, orderBy: [datetimeFifteenMinutes_ASC], limit: 10000) {
                                sum {
                                    totalCostMetricValue1
                                    totalCostMetricValue2
                                    totalNeurons
                                    __typename
                                }
                                dimensions {
                                    datetimeFifteenMinutes
                                    modelId
                                    costMetricName1
                                    costMetricName2
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

            // 发送模型使用查询
            const modelResponse = await fetch('/api/proxies/cloudflare/client/v4/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelUsageQuery)
            });

            if (!modelResponse.ok) {
                throw new Error('GraphQL请求失败');
            }

            const modelData = await modelResponse.json();

            console.log('模型使用响应:', modelData);

            // 处理模型使用数据
            const modelUsageMap = new Map<string, number>();
            if (modelData.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups) {
                const groups = modelData.data.viewer.accounts[0].aiInferenceAdaptiveGroups;

                // 按模型汇总使用量
                groups.forEach((group: any) => {
                    const modelId = group.dimensions?.modelId;
                    const neurons = group.sum?.totalNeurons || 0;

                    if (modelId && neurons > 0) {
                        modelUsageMap.set(modelId, (modelUsageMap.get(modelId) || 0) + neurons);
                    }
                });
            }

            // 创建模型统计列表
            const modelStats: ModelUsageStats[] = AI_MODELS.map(model => ({
                model_id: model.id,
                model_name: model.name,
                used: modelUsageMap.get(model.id) || 0,
                last_used: new Date().toISOString()
            }));

            setUsageStats(modelStats);
        } catch (error: any) {
            console.error('获取使用统计失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    const clearText = () => {
        setTextInput('');
        setTextOutput('');
    };

    const generateText = async () => {
        if (!textInput.trim()) {
            message.warning('请输入提示词');
            return;
        }

        if (!apiKey || !accountId) {
            message.warning('请先在AI工具概览页面配置API密钥和账户ID');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `/api/proxies/cloudflare/client/v4/accounts/${accountId}/ai/run/${selectedModel}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'user', content: textInput }
                        ],
                        max_tokens: 1000,
                        temperature: 0.7,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.result?.response) {
                setTextOutput(data.result.response);
                message.success('文本生成成功');
                fetchUsageStats(); // 更新使用统计
            } else {
                throw new Error(data.errors?.[0]?.message || '生成失败');
            }
        } catch (error: any) {
            message.error(`生成失败: ${error.message}`);
            console.error('Text generation error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                📝 AI文本生成
            </Title>
            <Paragraph>
                使用先进的AI模型进行文本生成、对话和创作。支持多种模型选择，满足不同场景需求。
            </Paragraph>

            {/* 配置状态提示 */}
            {!apiKey || !accountId ? (
                <Alert
                    message="需要配置API"
                    description="请先在AI工具概览页面配置Cloudflare API密钥和账户ID"
                    type="warning"
                    showIcon
                    style={{ marginBottom: '16px' }}
                />
            ) : (
                usageStats && usageStats.length > 0 && (
                    <Alert
                        message="文本生成模型使用统计"
                        description={
                            <div>
                                {usageStats.map((model) => (
                                    <div key={model.model_id} style={{ marginBottom: '4px' }}>
                                        {model.model_name}: {model.used} 神经元
                                    </div>
                                ))}
                            </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: '16px' }}
                    />
                )
            )}

            {/* 模型选择 */}
            <Card title="模型选择" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Title level={4}>选择AI模型</Title>
                    <Select
                        value={selectedModel}
                        onChange={setSelectedModel}
                        style={{ width: '100%' }}
                        optionLabelProp="label"
                    >
                        {AI_MODELS.map(model => (
                            <Option key={model.id} value={model.id}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{model.name}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{model.description}</div>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </Space>
            </Card>

            {/* 文本生成区域 */}
            <Card title="文本生成" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>输入提示词</Title>
                        <TextArea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="请输入您想要AI生成的内容提示..."
                            rows={6}
                            maxLength={2000}
                            showCount
                        />
                    </div>

                    <Space>
                        <Button
                            type="primary"
                            onClick={generateText}
                            loading={loading}
                            icon={<SendOutlined />}
                        >
                            生成文本
                        </Button>
                        <Button onClick={clearText} icon={<ClearOutlined />}>
                            清空
                        </Button>
                    </Space>

                    {textOutput && (
                        <div>
                            <Title level={4}>生成结果</Title>
                            <div style={{
                                padding: '16px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '8px',
                                position: 'relative'
                            }}>
                                <Button
                                    size="small"
                                    icon={<CopyOutlined />}
                                    style={{ position: 'absolute', top: '8px', right: '8px' }}
                                    onClick={() => copyText(textOutput)}
                                >
                                    复制
                                </Button>
                                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, paddingRight: '80px' }}>
                                    {textOutput}
                                </pre>
                            </div>
                        </div>
                    )}
                </Space>
            </Card>
        </div>
    );
}
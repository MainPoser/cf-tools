import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Select, Alert } from 'antd';
import { SendOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

// AI图像生成模型配置
const AI_MODELS = [
    { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL', description: '高质量图像生成模型' },
    { id: '@cf/bytedance/stable-diffusion-xl-lightning', name: 'SDXL Lightning', description: '快速图像生成模型' },
];

// 单个模型使用统计
interface ModelUsageStats {
    model_id: string;
    model_name: string;
    used: number; // 该模型已使用的神经元数量
    last_used: string;
}

export default function AIImageGeneration() {
    useAutoTrackVisit('AI图像生成');

    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [accountId, setAccountId] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
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
            // 查询所有图像生成模型的使用情况
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

    const clearImage = () => {
        setImagePrompt('');
        setGeneratedImage('');
        if (generatedImage && generatedImage.startsWith('blob:')) {
            URL.revokeObjectURL(generatedImage);
        }
    };

    const downloadImage = () => {
        if (!generatedImage) return;

        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `ai-generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generateImage = async () => {
        if (!imagePrompt.trim()) {
            message.warning('请输入图像描述');
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
                        prompt: imagePrompt
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.errors?.[0]?.message || errorMessage;
                } catch {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.success && data.result?.image) {
                    setGeneratedImage(`data:image/png;base64,${data.result.image}`);
                } else {
                    throw new Error(data.errors?.[0]?.message || '生成失败');
                }
            } else {
                const imageBlob = await response.blob();
                const imageUrl = URL.createObjectURL(imageBlob);
                setGeneratedImage(imageUrl);
            }

            message.success('图像生成成功');
            fetchUsageStats(); // 更新使用统计
        } catch (error: any) {
            message.error(`生成失败: ${error.message}`);
            console.error('Image generation error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                🎨 AI图像生成
            </Title>
            <Paragraph>
                使用先进的AI模型生成高质量图像。支持多种风格和描述，让您的创意变为现实。
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
                        message="图像生成模型使用统计"
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

            {/* 图像生成区域 */}
            <Card title="图像生成" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>图像描述<strong style={{ color: '#f5222d' }}>由于模型问题，强烈建议使用英文关键字描述</strong></Title>
                        <TextArea
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            placeholder="请描述您想要生成的图像..."
                            rows={4}
                            maxLength={500}
                            showCount
                        />
                    </div>

                    <Space>
                        <Button
                            type="primary"
                            onClick={generateImage}
                            loading={loading}
                            icon={<SendOutlined />}
                        >
                            生成图像
                        </Button>
                        <Button onClick={clearImage} icon={<ClearOutlined />}>
                            清空
                        </Button>
                    </Space>

                    {generatedImage && (
                        <div>
                            <Title level={4}>生成结果</Title>
                            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                                <img
                                    src={generatedImage}
                                    alt="Generated"
                                    style={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        maxHeight: '400px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            <Space style={{ marginTop: '12px' }}>
                                <Button onClick={downloadImage} icon={<DownloadOutlined />}>
                                    下载图像
                                </Button>
                            </Space>
                        </div>
                    )}
                </Space>
            </Card>
        </div>
    );
}
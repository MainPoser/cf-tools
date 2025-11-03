import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Select, Divider, Row, Col, Alert, Tabs } from 'antd';
import { RobotOutlined, SendOutlined, ClearOutlined, CopyOutlined, ApiOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// Cloudflare Worker AI 模型配置
const AI_MODELS = {
    text: [
        { id: '@cf/meta/llama-3.1-8b-instruct', name: 'LLaMA 3.1 8B Instruct', description: '通用对话模型，适合各种文本生成任务' },
        { id: '@cf/mistral/mistral-7b-instruct-v0.2', name: 'Mistral 7B Instruct', description: '轻量级对话模型，响应速度快' },
        { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', description: '高性能模型，适合复杂推理任务' },
    ],
    image: [
        { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL', description: '高质量图像生成模型' },
        { id: '@cf/bytedance/stable-diffusion-xl-lightning', name: 'SDXL Lightning', description: '快速图像生成模型' },
    ],
    translation: [
        { id: '@cf/meta/m2m100-1.2b', name: 'M2M100 1.2B', description: '多语言翻译模型，支持100+语言' },
    ]
};

// 单个模型使用统计
interface ModelUsageStats {
    model_id: string;
    model_name: string;
    used: number; // 该模型已使用的神经元数量
    last_used: string;
}

// 总体使用统计
interface UsageStats {
    total_daily_used: number;
    total_daily_limit: number; // 固定为10000
    total_remaining: number;
    reset_time: string;
    models: ModelUsageStats[];
}

export default function WorkerAI() {
    // 自动统计页面访问
    useAutoTrackVisit('Cloudflare Worker AI');

    // 基础状态
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [accountId, setAccountId] = useState('');

    // 文本生成状态
    const [textInput, setTextInput] = useState('');
    const [textOutput, setTextOutput] = useState('');
    const [selectedTextModel, setSelectedTextModel] = useState(AI_MODELS.text[0].id);

    // 图像生成状态
    const [imagePrompt, setImagePrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState('');
    const [selectedImageModel, setSelectedImageModel] = useState(AI_MODELS.image[0].id);

    // 翻译状态
    const [translationText, setTranslationText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('zh');

    // 使用统计
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

    // 保存配置到localStorage
    const saveConfig = () => {
        localStorage.setItem('cf_worker_api_key', apiKey);
        localStorage.setItem('cf_account_id', accountId);
        message.success('配置已保存');
    };

    // 获取使用统计
    const fetchUsageStats = async () => {
        if (!apiKey || !accountId) {
            message.warning('请先配置API密钥和账户ID');
            return;
        }
        setLoading(true);
        try {
            // 获取今天的日期
            const today = new Date().toISOString().split('T')[0];

            // 1. 查询总消耗神经元
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

            // 2. 查询所有模型的使用情况
            const allModelIds = [...AI_MODELS.text, ...AI_MODELS.image, ...AI_MODELS.translation].map(model => model.id);

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

            // 发送总神经元查询
            const totalResponse = await fetch('/api/proxies/cloudflare/client/v4/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(totalNeuronsQuery)
            });

            // 发送模型使用查询
            const modelResponse = await fetch('/api/proxies/cloudflare/client/v4/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelUsageQuery)
            });

            if (!totalResponse.ok || !modelResponse.ok) {
                throw new Error('GraphQL请求失败');
            }

            const totalData = await totalResponse.json();
            const modelData = await modelResponse.json();

            console.log('总神经元响应:', totalData);
            console.log('模型使用响应:', modelData);

            // 处理总神经元数据
            let totalDailyUsed = 0;
            if (totalData.data?.viewer?.accounts?.[0]?.data?.[0]?.sum?.neurons) {
                totalDailyUsed = totalData.data.viewer.accounts[0].data[0].sum.neurons;
            }

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

            const totalDailyLimit = 10000; // Cloudflare 免费配额是每天10000个神经元
            const totalRemaining = Math.max(0, totalDailyLimit - totalDailyUsed);

            // 创建模型统计列表
            const allModels = [...AI_MODELS.text, ...AI_MODELS.image, ...AI_MODELS.translation];
            const modelStats: ModelUsageStats[] = allModels.map(model => ({
                model_id: model.id,
                model_name: model.name,
                used: modelUsageMap.get(model.id) || 0,
                last_used: new Date().toISOString()
            }));

            // 计算下一个UTC 00:00重置时间，并转换为客户端时区
            const now = new Date();
            const nowUtc = new Date(now.toISOString()); // 当前UTC时间
            const tomorrowUtc = new Date(nowUtc);
            tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
            tomorrowUtc.setUTCHours(0, 0, 0, 0); // 设置为明天UTC 00:00:00

            // 将UTC时间转换为客户端本地时间字符串
            const resetTimeLocal = tomorrowUtc.toLocaleString();

            setUsageStats({
                total_daily_used: totalDailyUsed,
                total_daily_limit: totalDailyLimit,
                total_remaining: totalRemaining,
                reset_time: resetTimeLocal,
                models: modelStats
            });

            message.success('使用统计已更新');
        } catch (error: any) {
            console.error('获取使用统计失败:', error);
            message.error(`获取使用统计失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 文本生成
    const generateText = async () => {
        if (!textInput.trim()) {
            message.warning('请输入提示词');
            return;
        }

        if (!apiKey || !accountId) {
            message.warning('请先配置API密钥和账户ID');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `/api/proxies/cloudflare/client/v4/accounts/${accountId}/ai/run/${selectedTextModel}`,
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

    // 图像生成
    const generateImage = async () => {
        if (!imagePrompt.trim()) {
            message.warning('请输入图像描述');
            return;
        }

        if (!apiKey || !accountId) {
            message.warning('请先配置API密钥和账户ID');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `/api/proxies/cloudflare/client/v4/accounts/${accountId}/ai/run/${selectedImageModel}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: imagePrompt,
                        num_steps: 20,
                        guidance_scale: 7.5,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.result?.image) {
                setGeneratedImage(`data:image/png;base64,${data.result.image}`);
                message.success('图像生成成功');
                fetchUsageStats(); // 更新使用统计
            } else {
                throw new Error(data.errors?.[0]?.message || '生成失败');
            }
        } catch (error: any) {
            message.error(`生成失败: ${error.message}`);
            console.error('Image generation error:', error);
        } finally {
            setLoading(false);
        }
    };

    // 文本翻译
    const translateText = async () => {
        if (!translationText.trim()) {
            message.warning('请输入要翻译的文本');
            return;
        }

        if (!apiKey || !accountId) {
            message.warning('请先配置API密钥和账户ID');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `/api/proxies/cloudflare/client/v4/accounts/${accountId}/ai/run/${AI_MODELS.translation[0].id}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: translationText,
                        source_lang: sourceLang,
                        target_lang: targetLang,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.result?.translated_text) {
                setTranslatedText(data.result.translated_text);
                message.success('翻译成功');
                fetchUsageStats(); // 更新使用统计
            } else {
                throw new Error(data.errors?.[0]?.message || '翻译失败');
            }
        } catch (error: any) {
            message.error(`翻译失败: ${error.message}`);
            console.error('Translation error:', error);
        } finally {
            setLoading(false);
        }
    };

    // 复制文本
    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    // 下载图像
    const downloadImage = () => {
        if (!generatedImage) return;

        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `ai-generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('图像已下载');
    };

    // 清空函数
    const clearTextChat = () => {
        setTextInput('');
        setTextOutput('');
    };

    const clearImage = () => {
        setImagePrompt('');
        setGeneratedImage('');
    };

    const clearTranslation = () => {
        setTranslationText('');
        setTranslatedText('');
    };
    const tabItems = [
        {
            key: 'text',
            label: '文本生成',
            children: (<Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Title level={4}>选择模型</Title>
                    <Select
                        value={selectedTextModel}
                        onChange={setSelectedTextModel}
                        style={{ width: '100%', marginBottom: '16px' }}
                        optionLabelProp="label"
                    >
                        {AI_MODELS.text.map(model => (
                            <Option key={model.id} value={model.id} label={model.name}>
                                <div style={{ padding: '8px 0' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{model.name}</div>
                                    <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                        {model.description}
                                    </Text>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </div>

                <div>
                    <Title level={4}>输入提示词</Title>
                    <TextArea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="请输入您的提示词..."
                        rows={4}
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
                    <Button onClick={clearTextChat} icon={<ClearOutlined />}>
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
            </Space>),
        },
        {
            key: 'image',
            label: '图像生成',
            children: (<Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                    <Title level={4}>选择模型</Title>
                    <Select
                        value={selectedImageModel}
                        onChange={setSelectedImageModel}
                        style={{ width: '100%', marginBottom: '16px' }}
                        optionLabelProp="label"
                    >
                        {AI_MODELS.image.map(model => (
                            <Option key={model.id} value={model.id} label={model.name}>
                                <div style={{ padding: '8px 0' }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{model.name}</div>
                                    <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                        {model.description}
                                    </Text>
                                </div>
                            </Option>
                        ))}
                    </Select>
                </div>

                <div>
                    <Title level={4}>图像描述</Title>
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
                            <Button onClick={downloadImage}>
                                下载图像
                            </Button>
                        </Space>
                    </div>
                )}
            </Space>),
        },
        {
            key: 'translation',
            label: '文本翻译',
            children: (<Space direction="vertical" style={{ width: '100%' }} size="large">
                <Row gutter={16}>
                    <Col span={12}>
                        <Title level={4}>源语言</Title>
                        <Select
                            value={sourceLang}
                            onChange={setSourceLang}
                            style={{ width: '100%' }}
                        >
                            <Option value="en">英语</Option>
                            <Option value="zh">中文</Option>
                            <Option value="ja">日语</Option>
                            <Option value="ko">韩语</Option>
                            <Option value="fr">法语</Option>
                            <Option value="de">德语</Option>
                            <Option value="es">西班牙语</Option>
                            <Option value="ru">俄语</Option>
                        </Select>
                    </Col>
                    <Col span={12}>
                        <Title level={4}>目标语言</Title>
                        <Select
                            value={targetLang}
                            onChange={setTargetLang}
                            style={{ width: '100%' }}
                        >
                            <Option value="en">英语</Option>
                            <Option value="zh">中文</Option>
                            <Option value="ja">日语</Option>
                            <Option value="ko">韩语</Option>
                            <Option value="fr">法语</Option>
                            <Option value="de">德语</Option>
                            <Option value="es">西班牙语</Option>
                            <Option value="ru">俄语</Option>
                        </Select>
                    </Col>
                </Row>

                <div>
                    <Title level={4}>输入文本</Title>
                    <TextArea
                        value={translationText}
                        onChange={(e) => setTranslationText(e.target.value)}
                        placeholder="请输入要翻译的文本..."
                        rows={4}
                        maxLength={2000}
                        showCount
                    />
                </div>

                <Space>
                    <Button
                        type="primary"
                        onClick={translateText}
                        loading={loading}
                        icon={<SendOutlined />}
                    >
                        翻译
                    </Button>
                    <Button onClick={clearTranslation} icon={<ClearOutlined />}>
                        清空
                    </Button>
                </Space>

                {translatedText && (
                    <div>
                        <Title level={4}>翻译结果</Title>
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
                                onClick={() => copyText(translatedText)}
                            >
                                复制
                            </Button>
                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, paddingRight: '80px' }}>
                                {translatedText}
                            </pre>
                        </div>
                    </div>
                )}
            </Space>),
        }
    ];
    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <RobotOutlined style={{ marginRight: '8px' }} />
                Cloudflare Worker AI
            </Title>
            <Paragraph>
                使用 Cloudflare Worker AI 进行文本生成、图像创建和多语言翻译。每天免费提供 10,000 个神经元，超过后将无法使用。
            </Paragraph>

            {/* 配置区域 */}
            <Card title="API 配置" style={{ marginBottom: '16px' }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Title level={4}>账户 ID</Title>
                        <Input
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="请输入 Cloudflare 账户 ID"
                            style={{ marginBottom: '16px' }}
                        />
                    </Col>
                    <Col span={12}>
                        <Title level={4}>API Token</Title>
                        <Input.Password
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="请输入 Cloudflare API Token"
                            style={{ marginBottom: '16px' }}
                        />
                    </Col>
                </Row>
                <Space>
                    <Button type="primary" onClick={saveConfig} icon={<ApiOutlined />}>
                        保存配置
                    </Button>
                    <Button onClick={fetchUsageStats}>
                        查看使用统计
                    </Button>
                </Space>

                {usageStats && (
                    <div style={{ marginTop: '16px' }}>
                        <Alert
                            message={`总体使用情况: ${usageStats.total_daily_used} / ${usageStats.total_daily_limit} 神经元`}
                            description={`剩余: ${usageStats.total_remaining} 神经元 | 重置时间: ${usageStats.reset_time}`}
                            type={usageStats.total_remaining > 1000 ? 'success' : usageStats.total_remaining > 100 ? 'warning' : 'error'}
                            showIcon
                            style={{ marginBottom: '16px' }}
                        />

                        {/* 配额使用进度条 */}
                        <Card title="配额使用详情" size="small">
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <Text strong>今日配额使用率</Text>
                                    <Text style={{
                                        color: usageStats.total_remaining > 1000 ? '#52c41a' : usageStats.total_remaining > 100 ? '#faad14' : '#ff4d4f',
                                        fontWeight: 'bold'
                                    }}>
                                        {((usageStats.total_daily_used / usageStats.total_daily_limit) * 100).toFixed(1)}%
                                    </Text>
                                </div>
                                <div style={{
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '4px',
                                    height: '8px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${Math.min((usageStats.total_daily_used / usageStats.total_daily_limit) * 100, 100)}%`,
                                        height: '100%',
                                        backgroundColor: usageStats.total_remaining > 1000 ? '#52c41a' : usageStats.total_remaining > 100 ? '#faad14' : '#ff4d4f',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary">已使用: {usageStats.total_daily_used} 神经元</Text>
                                    <Text type="secondary">剩余: {usageStats.total_remaining} 神经元</Text>
                                </div>
                            </div>

                            <Divider />

                            <Title level={5}>可用模型</Title>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {usageStats.models.map((model, index) => (
                                    <div key={model.model_id} style={{
                                        marginBottom: '8px',
                                        padding: '8px',
                                        backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                                        borderRadius: '4px',
                                        border: '1px solid #f0f0f0'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text>{model.model_name}</Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {model.model_id}
                                                </Text>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    共享配额
                                                </Text>
                                                <Text type="warning" style={{ fontSize: '12px' }}>
                                                    最近24小时使用: {model.used} 神经元
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Alert
                                style={{ marginTop: '12px' }}
                                message="配额说明"
                                description="所有模型共享每天10,000个神经元的配额。不同模型消耗的神经元数量不同，文本生成通常消耗较少，图像生成消耗较多。"
                                type="info"
                                showIcon
                            />
                        </Card>
                    </div>
                )}
            </Card>

            {/* 功能选项卡 */}
            <Card>
                <Tabs defaultActiveKey="text" items={tabItems}>
                </Tabs>
            </Card>

            <Card title="使用说明" style={{ marginTop: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Title level={5}>配置说明：</Title>
                        <ul>
                            <li><strong>需要在 Cloudflare 控制台创建 API Token</strong></li>
                            <li>API Token 需要包含 <strong>Worker AI</strong> 权限</li>
                            <li>API Token 需要包含 <strong>账户 账户分析 读取</strong> 权限</li>
                            <li>账户 ID 可以在 Cloudflare 控制台右侧边栏找到</li>
                            <li>配置信息会保存在本地浏览器中</li>
                        </ul>
                    </div>
                    <div>
                        <Title level={5}>使用限制：</Title>
                        <ul>
                            <li>所有模型<strong>共享</strong>每天免费提供的 <strong>10,000</strong> 个神经元配额</li>
                            <li>不同模型消耗的神经元数量不同：
                                <ul>
                                    <li>文本生成模型：每次请求约消耗100-500个神经元</li>
                                    <li>图像生成模型：每次请求约消耗500-2000个神经元</li>
                                    <li>翻译模型：每次请求约消耗50-200个神经元</li>
                                </ul>
                            </li>
                            <li>超过限制后需要等待第二天重置或升级账户</li>
                            <li>统计可能会存在延迟，建议在使用后查看统计信息，确保不超过配额</li>
                            <li>建议合理使用，避免浪费配额</li>
                        </ul>
                    </div>
                    <div>
                        <Title level={5}>模型说明：</Title>
                        <ul>
                            <li><strong>LLaMA 3.1 8B</strong>：通用对话模型，适合各种文本生成任务</li>
                            <li><strong>Mistral 7B</strong>：轻量级模型，响应速度快，适合简单对话</li>
                            <li><strong>DeepSeek R1</strong>：高性能模型，适合复杂推理和编程任务</li>
                            <li><strong>Stable Diffusion XL</strong>：高质量图像生成，适合专业用途</li>
                            <li><strong>SDXL Lightning</strong>：快速图像生成，适合实时应用</li>
                        </ul>
                    </div>
                </Space>
            </Card>
        </div>
    );
}
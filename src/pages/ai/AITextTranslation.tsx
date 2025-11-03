import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Select, Row, Col, Alert } from 'antd';
import { SendOutlined, ClearOutlined, CopyOutlined, ApiOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// 支持的语言列表
const LANGUAGES = [
    { code: 'en', name: '英语' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日语' },
    { code: 'ko', name: '韩语' },
    { code: 'fr', name: '法语' },
    { code: 'de', name: '德语' },
    { code: 'es', name: '西班牙语' },
    { code: 'ru', name: '俄语' },
];

// 翻译模型配置
const TRANSLATION_MODEL = {
    id: '@cf/meta/m2m100-1.2b',
    name: 'M2M100 1.2B',
    description: '多语言翻译模型，支持100+语言'
};

// 单个模型使用统计
interface ModelUsageStats {
    model_id: string;
    model_name: string;
    used: number; // 该模型已使用的神经元数量
    last_used: string;
}

export default function AITextTranslation() {
    useAutoTrackVisit('AI文本翻译');

    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [accountId, setAccountId] = useState('');
    const [translationText, setTranslationText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('zh');

    // 使用统计
    const [usageStats, setUsageStats] = useState<ModelUsageStats | null>(null);

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
    };

    // 获取使用统计
    const fetchUsageStats = async () => {
        if (!apiKey || !accountId) {
            message.warning('请先配置API密钥和账户ID');
            return;
        }
        setLoading(true);
        try {
            // 查询翻译模型的使用情况
            const modelUsageQuery = {
                operationName: "GetAIInferencesCostsGroupByModelsOverTime",
                variables: {
                    accountTag: accountId,
                    datetimeStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24小时前
                    datetimeEnd: new Date().toISOString(),
                    modelIds: [TRANSLATION_MODEL.id]
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
            let modelUsed = 0;
            if (modelData.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups) {
                const groups = modelData.data.viewer.accounts[0].aiInferenceAdaptiveGroups;

                // 按模型汇总使用量
                groups.forEach((group: any) => {
                    const modelId = group.dimensions?.modelId;
                    const neurons = group.sum?.totalNeurons || 0;

                    if (modelId && neurons > 0) {
                        modelUsed += neurons;
                    }
                });
            }

            // 创建模型统计
            const modelStats: ModelUsageStats = {
                model_id: TRANSLATION_MODEL.id,
                model_name: TRANSLATION_MODEL.name,
                used: modelUsed,
                last_used: new Date().toISOString()
            };

            setUsageStats(modelStats);
            message.success('使用统计已更新');
        } catch (error: any) {
            console.error('获取使用统计失败:', error);
            message.error(`获取使用统计失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyText = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    const clearTranslation = () => {
        setTranslationText('');
        setTranslatedText('');
    };

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
                `/api/proxies/cloudflare/client/v4/accounts/${accountId}/ai/run/${TRANSLATION_MODEL.id}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: translationText,
                        source_lang: sourceLang,
                        target_lang: targetLang
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

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                🌐 AI文本翻译
            </Title>
            <Paragraph>
                使用先进的AI模型进行高质量的多语言翻译。支持100+种语言互译，准确度高，语境理解强。
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
                        {/* 翻译模型使用统计 */}
                        <Card title="翻译模型使用统计" size="small">
                            <div style={{ marginBottom: '16px' }}>
                                <Title level={5}>模型信息</Title>
                                <div style={{
                                    marginBottom: '8px',
                                    padding: '8px',
                                    backgroundColor: '#fafafa',
                                    borderRadius: '4px',
                                    border: '1px solid #f0f0f0'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <Text strong>{usageStats.model_name}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                {usageStats.model_id}
                                            </Text>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text type="warning" style={{ fontSize: '12px', display: 'block' }}>
                                                最近24小时使用: {usageStats.used} 神经元
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Alert
                                style={{ marginTop: '12px' }}
                                message="使用说明"
                                description="翻译通常消耗50-200个神经元。所有模型共享每天10,000个神经元的配额。"
                                type="info"
                                showIcon
                            />
                        </Card>
                    </div>
                )}
            </Card>

            {/* 翻译设置 */}
            <Card title="翻译设置" style={{ marginBottom: '16px' }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Title level={4}>源语言</Title>
                        <Select
                            value={sourceLang}
                            onChange={setSourceLang}
                            style={{ width: '100%' }}
                        >
                            {LANGUAGES.map(lang => (
                                <Option key={lang.code} value={lang.code}>{lang.name}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={12}>
                        <Title level={4}>目标语言</Title>
                        <Select
                            value={targetLang}
                            onChange={setTargetLang}
                            style={{ width: '100%' }}
                        >
                            {LANGUAGES.map(lang => (
                                <Option key={lang.code} value={lang.code}>{lang.name}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {/* 翻译区域 */}
            <Card title="文本翻译" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
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
                </Space>
            </Card>
        </div>
    );
}
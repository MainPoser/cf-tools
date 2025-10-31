import { useState } from 'react';
import { Card, Input, Button, Typography, Space, message, Select, Tabs, Alert } from 'antd';
import { CopyOutlined, CodeOutlined, DeleteOutlined, SwapOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';
import * as yaml from 'js-yaml';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

type FormatType = 'json' | 'yaml' | 'xml' | 'toml' | 'csv';

export default function ConfigFormatter() {
    // 自动统计页面访问
    useAutoTrackVisit('配置格式转换');

    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [inputFormat, setInputFormat] = useState<FormatType>('json');
    const [outputFormat, setOutputFormat] = useState<FormatType>('json');
    const [indentSize, setIndentSize] = useState(2);
    const [activeTab, setActiveTab] = useState('converter');

    // 检测输入格式
    const detectFormat = (text: string): FormatType => {
        const trimmed = text.trim();
        if (!trimmed) return 'json';

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return 'json';
        }
        if (trimmed.includes(':') && !trimmed.includes('{')) {
            return 'yaml';
        }
        if (trimmed.startsWith('<')) {
            return 'xml';
        }
        if (trimmed.includes(',') && trimmed.includes('\n')) {
            return 'csv';
        }
        return 'json';
    };

    // 解析输入内容 - 返回 { success: boolean, data?: any, error?: string }
    const parseInput = (text: string, format: FormatType): { success: boolean; data?: any; error?: string } => {
        try {
            switch (format) {
                case 'json':
                    return { success: true, data: JSON.parse(text) };
                case 'yaml':
                    return { success: true, data: yaml.load(text) };
                case 'xml':
                    // 简单的XML解析（实际项目中建议使用更强大的XML解析库）
                    return { success: false, error: 'XML解析功能开发中' };
                case 'toml':
                    return { success: false, error: 'TOML解析功能开发中' };
                case 'csv':
                    // 简单的CSV解析
                    const lines = text.split('\n').filter(line => line.trim());
                    if (lines.length === 0) {
                        return { success: false, error: 'CSV内容为空' };
                    }
                    const headers = lines[0].split(',').map(h => h.trim());
                    const data = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim());
                        const obj: any = {};
                        headers.forEach((header, index) => {
                            obj[header] = values[index];
                        });
                        return obj;
                    });
                    return { success: true, data };
                default:
                    return { success: false, error: '不支持的格式' };
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `解析${format.toUpperCase()}失败: ${errorMessage}` };
        }
    };

    // 格式化输出内容 - 返回 { success: boolean, result?: string, error?: string }
    const formatOutput = (data: any, format: FormatType): { success: boolean; result?: string; error?: string } => {
        try {
            switch (format) {
                case 'json':
                    return { success: true, result: JSON.stringify(data, null, indentSize) };
                case 'yaml':
                    return { success: true, result: yaml.dump(data, { indent: indentSize }) };
                case 'xml':
                    return { success: false, error: 'XML输出功能开发中' };
                case 'toml':
                    return { success: false, error: 'TOML输出功能开发中' };
                case 'csv':
                    if (Array.isArray(data) && data.length > 0) {
                        const headers = Object.keys(data[0]);
                        const csvLines = [headers.join(',')];
                        data.forEach(row => {
                            const values = headers.map(header => row[header] || '');
                            csvLines.push(values.join(','));
                        });
                        return { success: true, result: csvLines.join('\n') };
                    }
                    return { success: false, error: 'CSV格式要求数组格式' };
                default:
                    return { success: false, error: '不支持的输出格式' };
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `生成${format.toUpperCase()}失败: ${errorMessage}` };
        }
    };
    // 格式转换
    const handleConvert = () => {
        if (!input.trim()) {
            message.warning('请输入要转换的内容');
            return;
        }

        const parseResult = parseInput(input, inputFormat);
        if (!parseResult.success) {
            message.error(parseResult.error);
            return;
        }

        const formatResult = formatOutput(parseResult.data, outputFormat);
        if (!formatResult.success) {
            message.error(formatResult.error);
            return;
        }

        setOutput(formatResult.result || '');
        message.success(`${inputFormat.toUpperCase()} 转 ${outputFormat.toUpperCase()} 成功`);
    };

    // 格式化（同格式美化）
    const handleFormat = () => {
        if (!input.trim()) {
            message.warning('请输入要格式化的内容');
            return;
        }

        const parseResult = parseInput(input, inputFormat);
        if (!parseResult.success) {
            message.error(parseResult.error);
            return;
        }

        const formatResult = formatOutput(parseResult.data, inputFormat);
        if (!formatResult.success) {
            message.error(formatResult.error);
            return;
        }

        setOutput(formatResult.result || '');
        message.success(`${inputFormat.toUpperCase()}格式化成功`);
    };

    // 压缩
    const handleMinify = () => {
        if (!input.trim()) {
            message.warning('请输入要压缩的内容');
            return;
        }

        const parseResult = parseInput(input, inputFormat);
        if (!parseResult.success) {
            message.error(parseResult.error);
            return;
        }

        try {
            let minifiedOutput: string;
            if (inputFormat === 'json') {
                minifiedOutput = JSON.stringify(parseResult.data);
            } else {
                const formatResult = formatOutput(parseResult.data, inputFormat);
                if (!formatResult.success) {
                    message.error(formatResult.error);
                    return;
                }
                minifiedOutput = formatResult.result || '';
            }
            setOutput(minifiedOutput);
            message.success(`${inputFormat.toUpperCase()}压缩成功`);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            message.error(`压缩失败: ${errorMessage}`);
        }
    };

    // 验证格式
    const handleValidate = () => {
        if (!input.trim()) {
            message.warning('请输入要验证的内容');
            return;
        }

        const parseResult = parseInput(input, inputFormat);
        if (!parseResult.success) {
            message.error(parseResult.error);
            return;
        }

        message.success(`${inputFormat.toUpperCase()}格式验证通过`);
    };

    // 自动检测格式
    const handleAutoDetect = () => {
        const detected = detectFormat(input);
        setInputFormat(detected);
        message.success(`检测到格式: ${detected.toUpperCase()}`);
    };

    // 交换输入输出
    const handleSwap = () => {
        setInput(output);
        setOutput(input);
        const temp = inputFormat;
        setInputFormat(outputFormat);
        setOutputFormat(temp);
    };

    // 复制结果到剪贴板
    const handleCopy = (text: string) => {
        if (!text) {
            message.warning('没有可复制的内容');
            return;
        }
        navigator.clipboard.writeText(text).catch(() => {
            message.error('复制失败，请手动复制');
        });
        message.success('已复制到剪贴板');
    };

    // 清空输入和输出
    const handleClear = () => {
        setInput('');
        setOutput('');
    };

    // 从输出复制到输入
    const handleCopyToInput = () => {
        if (!output) {
            message.warning('没有可复制的内容');
            return;
        }
        setInput(output);
        message.success('已复制到输入区域');
    };


    const examplesTabItems = [
        {
            key: 'json',
            label: 'JSON 示例', // 对应旧的 tab 属性
            children: (<Alert
                message="JSON 格式示例"
                description={
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                        {`{
  "name": "example-app",
  "version": "1.0.0",
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  },
  "features": ["auth", "logging", "cache"]
}`}
                    </pre>
                }
                type="info"
            />)
        },
        {
            key: 'yaml',
            label: 'YAML 示例', // 对应旧的 tab 属性
            children: (<Alert
                message="YAML 格式示例"
                description={
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                        {`name: example-app
version: 1.0.0
database:
  host: localhost
  port: 5432
  name: myapp
features:
  - auth
  - logging
  - cache`}
                    </pre>
                }
                type="info"
            />)
        },
        {
            key: 'csv',
            label: 'CSV 示例', // 对应旧的 tab 属性
            children: (                        <Alert
                            message="CSV 格式示例"
                            description={
                                <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                    {`name,age,city
Alice,25,New York
Bob,30,London
Charlie,35,Tokyo`}
                                </pre>
                            }
                            type="info"
                        />)
        }
    ]

    const tabItems = [
        {
            key: 'converter',
            label: '格式转换', // 对应旧的 tab 属性
            children: (<Card title="配置格式转换" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* 格式选择 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span>输入格式:</span>
                        <Select
                            value={inputFormat}
                            onChange={setInputFormat}
                            style={{ width: 120 }}
                        >
                            <Option value="json">JSON</Option>
                            <Option value="yaml">YAML</Option>
                            <Option value="xml">XML</Option>
                            <Option value="toml">TOML</Option>
                            <Option value="csv">CSV</Option>
                        </Select>

                        <SwapOutlined onClick={handleSwap} style={{ cursor: 'pointer', fontSize: '16px' }} />

                        <span>输出格式:</span>
                        <Select
                            value={outputFormat}
                            onChange={setOutputFormat}
                            style={{ width: 120 }}
                        >
                            <Option value="json">JSON</Option>
                            <Option value="yaml">YAML</Option>
                            <Option value="xml">XML</Option>
                            <Option value="toml">TOML</Option>
                            <Option value="csv">CSV</Option>
                        </Select>

                        <Button onClick={handleAutoDetect} size="small">
                            自动检测
                        </Button>
                    </div>

                    {/* 输入区域 */}
                    <div>
                        <Title level={4}>输入内容 ({inputFormat.toUpperCase()})</Title>
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`请输入${inputFormat.toUpperCase()}格式的内容...`}
                            rows={8}
                        />
                    </div>

                    {/* 操作按钮区域 */}
                    <Space>
                        <Button type="primary" onClick={handleConvert} icon={<SwapOutlined />}>
                            转换格式
                        </Button>
                        <Button onClick={handleFormat} icon={<CodeOutlined />}>
                            格式化
                        </Button>
                        <Button onClick={handleMinify} icon={<DeleteOutlined />}>
                            压缩
                        </Button>
                        <Button onClick={handleValidate}>
                            验证格式
                        </Button>
                        <Button onClick={handleClear}>
                            清空
                        </Button>
                        <div style={{ marginLeft: 'auto' }}>
                            <span style={{ marginRight: '8px' }}>缩进大小：</span>
                            <Select
                                value={indentSize}
                                onChange={setIndentSize}
                                style={{ width: 80 }}
                            >
                                <Option value={2}>2 空格</Option>
                                <Option value={4}>4 空格</Option>
                                <Option value={8}>8 空格</Option>
                                <Option value={0}>无缩进</Option>
                            </Select>
                        </div>
                    </Space>

                    {/* 输出区域 */}
                    <div>
                        <Title level={4}>输出结果 ({outputFormat.toUpperCase()})</Title>
                        <TextArea
                            value={output}
                            readOnly
                            rows={8}
                            style={{ backgroundColor: '#f5f5f5' }}
                        />
                        <Space style={{ marginTop: '8px' }}>
                            <Button
                                icon={<CopyOutlined />}
                                onClick={() => handleCopy(output)}
                                disabled={!output}
                            >
                                复制结果
                            </Button>
                            <Button
                                onClick={handleCopyToInput}
                                disabled={!output}
                            >
                                复制到输入
                            </Button>
                        </Space>
                    </div>
                </Space>
            </Card>), // 对应旧的 Tabs.TabPane 内部的内容
        },
        {
            key: 'examples',
            label: '使用示例',
            children: (<Card title="常见格式示例">
                <Tabs defaultActiveKey="json" items={examplesTabItems}>
                </Tabs>
            </Card>),
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <FileTextOutlined style={{ marginRight: '8px' }} />
                配置格式转换器
            </Title>
            <Paragraph>
                支持JSON、YAML、XML、TOML、CSV等多种配置格式的转换、格式化和验证
            </Paragraph>

            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems}>
            </Tabs>
        </div>
    );
}
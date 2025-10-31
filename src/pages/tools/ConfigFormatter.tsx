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
                    return parseXml(text);
                case 'toml':
                    return parseToml(text);
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

    // XML解析函数
    const parseXml = (text: string): { success: boolean; data?: any; error?: string } => {
        try {
            if (typeof window === 'undefined') {
                return { success: false, error: 'XML解析需要在浏览器环境中运行' };
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');

            // 检查解析错误
            const parseError = xmlDoc.getElementsByTagName('parsererror');
            if (parseError.length > 0) {
                return { success: false, error: 'XML格式错误: ' + parseError[0].textContent };
            }

            // 递归转换XML节点为对象
            const xmlToObject = (node: Element): any => {
                const obj: any = {};

                // 处理属性
                if (node.attributes.length > 0) {
                    obj['@attributes'] = {};
                    for (let i = 0; i < node.attributes.length; i++) {
                        const attr = node.attributes[i];
                        obj['@attributes'][attr.name] = attr.value;
                    }
                }

                // 处理子元素
                const children = node.children;
                if (children.length > 0) {
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        const childName = child.tagName;
                        const childValue = xmlToObject(child);

                        if (obj[childName]) {
                            // 如果已存在同名元素，转换为数组
                            if (!Array.isArray(obj[childName])) {
                                obj[childName] = [obj[childName]];
                            }
                            obj[childName].push(childValue);
                        } else {
                            obj[childName] = childValue;
                        }
                    }
                } else {
                    // 如果没有子元素，获取文本内容
                    const textContent = node.textContent?.trim();
                    if (textContent && Object.keys(obj).length === 0) {
                        return textContent;
                    }
                    if (textContent) {
                        obj['#text'] = textContent;
                    }
                }

                return obj;
            };

            const result = xmlToObject(xmlDoc.documentElement);
            return { success: true, data: result };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `XML解析失败: ${errorMessage}` };
        }
    };

    // TOML解析函数
    const parseToml = (text: string): { success: boolean; data?: any; error?: string } => {
        try {
            const lines = text.split('\n');
            const result: any = {};
            let currentSection: string[] = [];
            let isArraySection = false;

            for (let line of lines) {
                line = line.trim();

                // 跳过空行和注释
                if (!line || line.startsWith('#')) {
                    continue;
                }

                // 处理数组节标题 [[section]]
                if (line.startsWith('[[') && line.endsWith(']]')) {
                    const section = line.slice(2, -2).trim();
                    currentSection = section.split('.');
                    isArraySection = true;

                    // 确保路径存在并创建数组
                    let current = result;
                    for (let i = 0; i < currentSection.length; i++) {
                        const part = currentSection[i];
                        if (i === currentSection.length - 1) {
                            // 最后一个部分，创建数组
                            if (!current[part]) {
                                current[part] = [];
                            } else if (!Array.isArray(current[part])) {
                                // 如果不是数组，转换为数组
                                current[part] = [current[part]];
                            }
                            // 添加新的数组元素对象
                            current[part].push({});
                            current = current[part][current[part].length - 1];
                        } else {
                            if (!current[part]) {
                                current[part] = {};
                            }
                            current = current[part];
                        }
                    }
                    continue;
                }

                // 处理普通节标题 [section]
                if (line.startsWith('[') && line.endsWith(']')) {
                    const section = line.slice(1, -1).trim();
                    currentSection = section.split('.');
                    isArraySection = false;
                    let current = result;

                    for (let part of currentSection) {
                        if (!current[part]) {
                            current[part] = {};
                        }
                        current = current[part];
                    }
                    continue;
                }

                // 处理键值对
                const equalIndex = line.indexOf('=');
                if (equalIndex > 0) {
                    const key = line.slice(0, equalIndex).trim();
                    let value: string | number | boolean | any[] = line.slice(equalIndex + 1).trim();

                    // 处理数组值 [item1, item2, item3]
                    if (value.startsWith('[') && value.endsWith(']')) {
                        const arrayContent = value.slice(1, -1).trim();
                        if (arrayContent) {
                            const items = arrayContent.split(',').map(item => {
                                const trimmedItem = item.trim();
                                // 移除引号
                                if ((trimmedItem.startsWith('"') && trimmedItem.endsWith('"')) ||
                                    (trimmedItem.startsWith("'") && trimmedItem.endsWith("'"))) {
                                    return trimmedItem.slice(1, -1);
                                }
                                // 转换数字
                                if (!isNaN(Number(trimmedItem))) {
                                    return Number(trimmedItem);
                                }
                                // 转换布尔值
                                if (trimmedItem === 'true') return true;
                                if (trimmedItem === 'false') return false;
                                return trimmedItem;
                            });
                            value = items;
                        } else {
                            value = [];
                        }
                    }
                    // 处理字符串值
                    else if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    // 转换数字
                    else if (!isNaN(Number(value))) {
                        value = Number(value);
                    }
                    // 转换布尔值
                    else if (value === 'true') {
                        value = true;
                    } else if (value === 'false') {
                        value = false;
                    }

                    // 设置值
                    let current = result;
                    if (isArraySection && currentSection.length > 0) {
                        // 对于数组节，定位到最后一个数组元素
                        for (let i = 0; i < currentSection.length; i++) {
                            const part = currentSection[i];
                            if (i === currentSection.length - 1) {
                                // 最后一个部分，获取数组的最后一个元素
                                const arr = current[part];
                                current = arr[arr.length - 1];
                            } else {
                                current = current[part];
                            }
                        }
                    } else {
                        // 对于普通节，正常定位
                        for (let part of currentSection) {
                            current = current[part];
                        }
                    }
                    current[key] = value;
                }
            }

            return { success: true, data: result };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `TOML解析失败: ${errorMessage}` };
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
                    return formatXml(data);
                case 'toml':
                    return formatToml(data);
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

    // XML格式化函数
    const formatXml = (data: any): { success: boolean; result?: string; error?: string } => {
        try {
            const objectToXml = (obj: any, tagName: string = 'root', indent: number = 0): string => {
                const spaces = ' '.repeat(indent * indentSize);
                let xml = '';

                if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
                    return `${spaces}<${tagName}>${obj}</${tagName}>\n`;
                }

                if (Array.isArray(obj)) {
                    obj.forEach(item => {
                        xml += objectToXml(item, tagName, indent);
                    });
                    return xml;
                }

                if (typeof obj === 'object' && obj !== null) {
                    xml += `${spaces}<${tagName}>\n`;

                    // 处理属性
                    if (obj['@attributes']) {
                        // 属性处理逻辑可以在这里扩展
                    }

                    // 处理文本内容
                    if (obj['#text']) {
                        xml += `${spaces}${' '.repeat(indentSize)}${obj['#text']}\n`;
                    }

                    // 处理子元素
                    for (const [key, value] of Object.entries(obj)) {
                        if (key !== '@attributes' && key !== '#text') {
                            xml += objectToXml(value, key, indent + 1);
                        }
                    }

                    xml += `${spaces}</${tagName}>\n`;
                    return xml;
                }

                return `${spaces}<${tagName}></${tagName}>\n`;
            };

            const result = objectToXml(data, 'root').trim();
            return { success: true, result };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `XML格式化失败: ${errorMessage}` };
        }
    };

    // TOML格式化函数
    const formatToml = (data: any): { success: boolean; result?: string; error?: string } => {
        try {
            const tomlString = (obj: any, sectionName: string = '', isRoot: boolean = true): string => {
                let result = '';

                for (const [key, value] of Object.entries(obj)) {
                    if (value === null || value === undefined) {
                        continue;
                    }

                    if (Array.isArray(value)) {
                        // 处理数组
                        if (value.length === 0) {
                            result += `${key} = []\n`;
                        } else if (typeof value[0] === 'object' && value[0] !== null) {
                            // 对象数组，使用数组节 [[key]]
                            value.forEach(item => {
                                result += `\n[[${key}]]\n`;
                                result += tomlString(item, '', false);
                            });
                        } else {
                            // 基本类型数组
                            const arrayItems = value.map(item => {
                                if (typeof item === 'string') {
                                    return `"${item}"`;
                                } else if (typeof item === 'boolean') {
                                    return item.toString();
                                } else {
                                    return String(item);
                                }
                            });
                            result += `${key} = [${arrayItems.join(', ')}]\n`;
                        }
                    } else if (typeof value === 'object' && value !== null) {
                        // 处理嵌套对象
                        if (isRoot) {
                            // 根级别的对象作为节
                            result += `\n[${key}]\n`;
                            result += tomlString(value, '', false);
                        } else {
                            // 嵌套对象作为子节
                            result += `\n[${sectionName ? sectionName + '.' : ''}${key}]\n`;
                            result += tomlString(value, sectionName ? sectionName + '.' + key : key, false);
                        }
                    } else {
                        // 处理基本类型
                        let formattedValue = '';
                        if (typeof value === 'string') {
                            formattedValue = `"${value}"`;
                        } else if (typeof value === 'boolean') {
                            formattedValue = value.toString();
                        } else {
                            formattedValue = String(value);
                        }
                        result += `${key} = ${formattedValue}\n`;
                    }
                }

                return result;
            };

            const result = tomlString(data).trim();
            return { success: true, result };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `TOML格式化失败: ${errorMessage}` };
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
            key: 'xml',
            label: 'XML 示例', // 对应旧的 tab 属性
            children: (<Alert
                message="XML 格式示例"
                description={
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                        {`<?xml version="1.0" encoding="UTF-8"?>
<config>
    <name>example-app</name>
    <version>1.0.0</version>
    <database>
        <host>localhost</host>
        <port>5432</port>
        <name>myapp</name>
    </database>
    <features>
        <feature>auth</feature>
        <feature>logging</feature>
        <feature>cache</feature>
    </features>
</config>`}
                    </pre>
                }
                type="info"
            />)
        },
        {
            key: 'toml',
            label: 'TOML 示例', // 对应旧的 tab 属性
            children: (<Alert
                message="TOML 格式示例"
                description={
                    <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                        {`name = "example-app"
version = "1.0.0"
enabled = true
port = 8080

[database]
host = "localhost"
port = 5432
name = "myapp"
credentials = ["admin", "password"]

[database.backup]
enabled = true
schedule = "daily"

[[servers]]
host = "server1.example.com"
port = 8080
weight = 1

[[servers]]
host = "server2.example.com"
port = 8080
weight = 2

[features]
auth = true
logging = true
cache = false
allowed_ips = ["192.168.1.1", "10.0.0.1"]`}
                    </pre>
                }
                type="info"
            />)
        },
        {
            key: 'csv',
            label: 'CSV 示例', // 对应旧的 tab 属性
            children: (<Alert
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
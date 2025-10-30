import { useState } from 'react';
import { Card, Input, Button, Typography, Space, message, Select } from 'antd';
import { CopyOutlined, CodeOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function JsonFormatter() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [indentSize, setIndentSize] = useState(2);

    // 格式化JSON
    const handleFormat = () => {
        if (!input.trim()) {
            message.warning('请输入要格式化的JSON内容');
            return;
        }

        try {
            // 解析JSON字符串
            const parsedJson = JSON.parse(input);
            // 格式化JSON，指定缩进
            const formattedJson = JSON.stringify(parsedJson, null, indentSize);
            setOutput(formattedJson);
            message.success('JSON格式化成功');
        } catch (error) {
            message.error('JSON格式错误，请检查输入内容');
        }
    };

    // 压缩JSON
    const handleMinify = () => {
        if (!input.trim()) {
            message.warning('请输入要压缩的JSON内容');
            return;
        }

        try {
            const parsedJson = JSON.parse(input);
            const minifiedJson = JSON.stringify(parsedJson);
            setOutput(minifiedJson);
            message.success('JSON压缩成功');
        } catch (error) {
            message.error('JSON格式错误，请检查输入内容');
        }
    };

    // 复制结果到剪贴板
    const handleCopy = (text: string) => {
        if (!text) {
            message.warning('没有可复制的内容');
            return;
        }
        navigator.clipboard.writeText(text);
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

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>JSON 格式化工具</Title>
            <Paragraph>
                支持JSON格式化和压缩，可自定义缩进大小，方便查看和编辑JSON数据
            </Paragraph>

            <Card title="JSON 格式化器" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* 输入区域 */}
                    <div>
                        <Title level={4}>输入JSON</Title>
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="请输入要格式化或压缩的JSON内容..."
                            rows={8}
                        />
                    </div>

                    {/* 操作按钮区域 */}
                    <Space>
                        <Button type="primary" onClick={handleFormat} icon={<CodeOutlined />}>
                            格式化
                        </Button>
                        <Button onClick={handleMinify} icon={<DeleteOutlined />}>
                            压缩
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
                        <Title level={4}>输出结果</Title>
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
            </Card>

            {/* 功能说明卡片 */}
            <Card title="使用说明" style={{ marginTop: '16px' }}>
                <ul>
                    <li>在输入框中粘贴JSON字符串，点击"格式化"按钮进行美化</li>
                    <li>点击"压缩"按钮可以移除所有空格和换行符</li>
                    <li>可通过下拉菜单选择不同的缩进大小</li>
                    <li>格式化后的JSON可以复制到剪贴板或复制回输入区域</li>
                    <li>如果输入的JSON格式错误，会显示相应的错误提示</li>
                </ul>
            </Card>
        </div>
    );
}
import React, { useState } from 'react';
import { Card, Input, Button, Typography, Space, message } from 'antd';
import { CopyOutlined, SwapOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

export default function Base64Tool() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [isEncode, setIsEncode] = useState(true);

    const handleConvert = () => {
        if (!input.trim()) {
            message.warning('请输入要处理的内容');
            return;
        }

        try {
            if (isEncode) {
                const encoded = btoa(unescape(encodeURIComponent(input)));
                setOutput(encoded);
            } else {
                const decoded = decodeURIComponent(escape(atob(input)));
                setOutput(decoded);
            }
            message.success('转换成功');
        } catch (error) {
            message.error('转换失败，请检查输入格式');
        }
    };

    const handleSwap = () => {
        setInput(output);
        setOutput(input);
        setIsEncode(!isEncode);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    const handleClear = () => {
        setInput('');
        setOutput('');
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>Base64 编解码工具</Title>
            <Paragraph>
                支持 Base64 编码和解码，可以处理中文字符和特殊字符
            </Paragraph>

            <Card title={isEncode ? 'Base64 编码' : 'Base64 解码'} style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>输入内容</Title>
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isEncode ? '请输入要编码的内容...' : '请输入要解码的Base64字符串...'}
                            rows={6}
                        />
                    </div>

                    <Space>
                        <Button type="primary" onClick={handleConvert}>
                            {isEncode ? '编码' : '解码'}
                        </Button>
                        <Button icon={<SwapOutlined />} onClick={handleSwap}>
                            切换编解码
                        </Button>
                        <Button onClick={handleClear}>
                            清空
                        </Button>
                    </Space>

                    <div>
                        <Title level={4}>输出结果</Title>
                        <TextArea
                            value={output}
                            readOnly
                            rows={6}
                            style={{ backgroundColor: '#f5f5f5' }}
                        />
                        <Button 
                            icon={<CopyOutlined />} 
                            onClick={() => handleCopy(output)}
                            disabled={!output}
                            style={{ marginTop: '8px' }}
                        >
                            复制结果
                        </Button>
                    </div>
                </Space>
            </Card>
        </div>
    );
}
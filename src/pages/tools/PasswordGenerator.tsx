import { useState, useCallback } from 'react';
import { Card, Input, Button, Typography, Space, message, Slider, Switch, Row, Col } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph } = Typography;

interface PasswordOptions {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
    excludeSimilar: boolean;
}

export default function PasswordGenerator() {
    // 自动统计页面访问
    useAutoTrackVisit('密码生成器');

    const [password, setPassword] = useState('');
    const [options, setOptions] = useState<PasswordOptions>({
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false
    });

    const generatePassword = useCallback(() => {
        let charset = '';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const similar = 'il1Lo0O';

        if (options.includeUppercase) charset += uppercase;
        if (options.includeLowercase) charset += lowercase;
        if (options.includeNumbers) charset += numbers;
        if (options.includeSymbols) charset += symbols;

        if (options.excludeSimilar) {
            charset = charset.split('').filter(char => !similar.includes(char)).join('');
        }

        if (!charset) {
            message.error('请至少选择一种字符类型');
            return;
        }

        let generatedPassword = '';
        for (let i = 0; i < options.length; i++) {
            generatedPassword += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        setPassword(generatedPassword);
        message.success('密码生成成功');
    }, [options]);

    const handleCopy = () => {
        if (!password) {
            message.warning('请先生成密码');
            return;
        }
        navigator.clipboard.writeText(password);
        message.success('已复制到剪贴板');
    };

    const handleOptionChange = (key: keyof PasswordOptions, value: boolean | number) => {
        setOptions(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { text: '无', color: '#d9d9d9' };
        
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (pwd.length >= 12) strength++;
        if (pwd.length >= 16) strength++;
        if (/[a-z]/.test(pwd)) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

        if (strength <= 2) return { text: '弱', color: '#ff4d4f' };
        if (strength <= 4) return { text: '中', color: '#faad14' };
        if (strength <= 6) return { text: '强', color: '#52c41a' };
        return { text: '很强', color: '#1890ff' };
    };

    const strength = getPasswordStrength(password);

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>密码生成器</Title>
            <Paragraph>
                生成安全可靠的随机密码，支持自定义长度和字符类型
            </Paragraph>

            <Card title="密码生成" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>生成的密码</Title>
                        <Input.Password
                            value={password}
                            placeholder="点击生成密码按钮生成新密码"
                            size="large"
                            style={{ marginBottom: '8px' }}
                        />
                        <Space>
                            <Button 
                                type="primary" 
                                icon={<ReloadOutlined />}
                                onClick={generatePassword}
                            >
                                生成密码
                            </Button>
                            <Button 
                                icon={<CopyOutlined />}
                                onClick={handleCopy}
                                disabled={!password}
                            >
                                复制密码
                            </Button>
                        </Space>
                        {password && (
                            <div style={{ marginTop: '8px' }}>
                                <span>密码强度： </span>
                                <span style={{ color: strength.color, fontWeight: 'bold' }}>
                                    {strength.text}
                                </span>
                            </div>
                        )}
                    </div>

                    <div>
                        <Title level={4}>密码选项</Title>
                        <Row gutter={[16, 16]}>
                            <Col span={24}>
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>密码长度: {options.length}</span>
                                    </div>
                                    <Slider
                                        min={4}
                                        max={32}
                                        value={options.length}
                                        onChange={(value) => handleOptionChange('length', value)}
                                        marks={{
                                            8: '8',
                                            16: '16',
                                            24: '24',
                                            32: '32'
                                        }}
                                    />
                                </div>
                            </Col>
                            <Col span={12}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>包含大写字母 (A-Z)</span>
                                        <Switch
                                            checked={options.includeUppercase}
                                            onChange={(checked) => handleOptionChange('includeUppercase', checked)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>包含小写字母 (a-z)</span>
                                        <Switch
                                            checked={options.includeLowercase}
                                            onChange={(checked) => handleOptionChange('includeLowercase', checked)}
                                        />
                                    </div>
                                </Space>
                            </Col>
                            <Col span={12}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>包含数字 (0-9)</span>
                                        <Switch
                                            checked={options.includeNumbers}
                                            onChange={(checked) => handleOptionChange('includeNumbers', checked)}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>包含特殊字符</span>
                                        <Switch
                                            checked={options.includeSymbols}
                                            onChange={(checked) => handleOptionChange('includeSymbols', checked)}
                                        />
                                    </div>
                                </Space>
                            </Col>
                            <Col span={24}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>排除相似字符 (il1Lo0O)</span>
                                    <Switch
                                        checked={options.excludeSimilar}
                                        onChange={(checked) => handleOptionChange('excludeSimilar', checked)}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </div>
                </Space>
            </Card>
        </div>
    );
}
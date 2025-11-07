// 网络/节点计算器
import { useState } from 'react';
import { Card, Input, Button, Space, Typography, Row, Col, Divider, message } from 'antd';
import { useAutoTrackVisit } from '../../../hooks/useAnalytics';
import { isValidSubnetMask, calculateNetworkInfo, getCIDRFromMask } from '../../../services/ipUtils';

const { Text } = Typography;

interface NodeResult {
    networkAddress: string[];
    hostAddress: string[];
    broadcastAddress: string[];
    cidr: number;
}

export default function NetworkNodeCalculator() {
    useAutoTrackVisit('网络/节点计算器');

    // 子网掩码状态
    const [mask1, setMask1] = useState('255');
    const [mask2, setMask2] = useState('255');
    const [mask3, setMask3] = useState('255');
    const [mask4, setMask4] = useState('252');

    // IP地址状态
    const [ip1, setIp1] = useState('192');
    const [ip2, setIp2] = useState('168');
    const [ip3, setIp3] = useState('100');
    const [ip4, setIp4] = useState('1');

    // 结果状态
    const [result, setResult] = useState<NodeResult | null>(null);

    const handleCalculate = () => {
        // 验证子网掩码
        const mask = `${mask1}.${mask2}.${mask3}.${mask4}`;
        if (!isValidSubnetMask(mask)) {
            message.error('请输入有效的子网掩码');
            return;
        }

        // 验证IP地址
        const ip = `${ip1}.${ip2}.${ip3}.${ip4}`;
        const isValidIP = (ip: string): boolean => {
            const parts = ip.split('.');
            return parts.length === 4 && parts.every(part => {
                const num = parseInt(part);
                return !isNaN(num) && num >= 0 && num <= 255;
            });
        };

        if (!isValidIP(ip)) {
            message.error('请输入有效的IP地址');
            return;
        }

        // 计算网络信息
        const networkInfo = calculateNetworkInfo(ip, mask);
        const hostAddress = ip.split('.');

        setResult({
            networkAddress: networkInfo.network.split('.'),
            hostAddress,
            broadcastAddress: networkInfo.broadcast.split('.'),
            cidr: getCIDRFromMask(mask)
        });

        message.success('计算完成');
    };

    const handleClear = () => {
        // 重置子网掩码
        setMask1('255');
        setMask2('255');
        setMask3('255');
        setMask4('252');

        // 重置IP地址
        setIp1('192');
        setIp2('168');
        setIp3('100');
        setIp4('1');

        // 清除结果
        setResult(null);

        message.success('已清除');
    };

    const validateInput = (value: string, setter: (value: string) => void) => {
        const num = parseInt(value);
        if (value === '' || (num >= 0 && num <= 255)) {
            setter(value);
        }
    };

    return (
        <Card
            title="网络/节点计算器"
            size="small"
            styles={{header: { background: '#fff7e6', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* 子网掩码输入 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>子网掩码:</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <Input
                            value={mask1}
                            onChange={(e) => validateInput(e.target.value, setMask1)}
                            placeholder="255"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={mask2}
                            onChange={(e) => validateInput(e.target.value, setMask2)}
                            placeholder="255"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={mask3}
                            onChange={(e) => validateInput(e.target.value, setMask3)}
                            placeholder="255"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={mask4}
                            onChange={(e) => validateInput(e.target.value, setMask4)}
                            placeholder="252"
                            size="small"
                            style={{ width: '50px' }}
                        />
                    </div>
                </div>

                {/* IP地址输入 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>TCP/IP 地址:</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <Input
                            value={ip1}
                            onChange={(e) => validateInput(e.target.value, setIp1)}
                            placeholder="192"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={ip2}
                            onChange={(e) => validateInput(e.target.value, setIp2)}
                            placeholder="168"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={ip3}
                            onChange={(e) => validateInput(e.target.value, setIp3)}
                            placeholder="100"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={ip4}
                            onChange={(e) => validateInput(e.target.value, setIp4)}
                            placeholder="1"
                            size="small"
                            style={{ width: '50px' }}
                        />
                        <Button type="primary" onClick={handleCalculate} size="small" style={{ flex: 'none' }}>
                            计算
                        </Button>
                        <Button onClick={handleClear} size="small" style={{ flex: 'none' }}>
                            清除
                        </Button>
                    </div>
                </div>

                {/* 输出区域 */}
                {result && (
                    <div>
                        <Divider style={{ margin: '10px 0' }} />
                        <Row gutter={[8, 8]}>
                            <Col span={24}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>网络地址</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>
                                        {result.networkAddress.join('.')}
                                    </Text>
                                </div>
                            </Col>
                            <Col span={24}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>节点/主机地址</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>
                                        {result.hostAddress.join('.')}
                                    </Text>
                                </div>
                            </Col>
                            <Col span={24}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>广播地址</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>
                                        {result.broadcastAddress.join('.')}
                                    </Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>CIDR</Text>
                                    <Text code style={{ fontSize: '12px' }}>/{result.cidr}</Text>
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}
            </Space>
        </Card>
    );
}
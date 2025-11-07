// 网络和IP地址计算器
import { useState } from 'react';
import { Card, Input, Button, Space, InputNumber, Typography, Row, Col, Divider, message } from 'antd';
import { isValidIP, getMaskFromCIDR, calculateNetworkInfo } from '../../../services/ipUtils';

const { Text } = Typography;

export default function NetworkCalculator() {
    const [networkIP, setNetworkIP] = useState('192.168.1.1');
    const [networkMaskBits, setNetworkMaskBits] = useState(24);
    const [networkMask, setNetworkMask] = useState('255.255.255.0');
    const [networkResult, setNetworkResult] = useState<any>(null);

    const handleNetworkCalculation = () => {
        if (!isValidIP(networkIP)) {
            message.error('请输入有效的IP地址');
            return;
        }

        if (networkMaskBits < 0 || networkMaskBits > 32) {
            message.error('掩码位数必须在0-32之间');
            return;
        }

        const finalMask = getMaskFromCIDR(networkMaskBits);
        const result = calculateNetworkInfo(networkIP, finalMask);

        setNetworkMask(finalMask);
        setNetworkResult(result);
        message.success('计算完成');
    };

    const handleClear = () => {
        setNetworkIP('');
        setNetworkMaskBits(24);
        setNetworkMask('255.255.255.0');
        setNetworkResult(null);
        message.success('已清除');
    };

    const handleCopyAll = () => {
        if (!networkResult) return;

        const resultText = `可用地址：${networkResult.usableHosts}
掩码：${networkMask}
网络：${networkResult.network}
第一个可用：${networkResult.firstHost}
最后可用：${networkResult.lastHost}
广播：${networkResult.broadcast}`;

        navigator.clipboard.writeText(resultText);
        message.success('已复制所有结果');
    };

    return (
        <Card 
            title="网络和IP地址计算器" 
            size="small"
            styles={{header: { background: '#e6f7ff', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>IP/掩码：</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <Input
                            value={networkIP}
                            onChange={(e) => setNetworkIP(e.target.value)}
                            placeholder="192.168.1.1"
                            size="small"
                            style={{ width: '130px', flex: 'none' }}
                        />
                        <Text style={{ color: '#666' }}>/</Text>
                        <InputNumber
                            min={0}
                            max={32}
                            value={networkMaskBits}
                            onChange={(value) => setNetworkMaskBits(value || 0)}
                            placeholder="24"
                            size="small"
                            style={{ width: '70px', flex: 'none' }}
                        />
                        <Button
                            type="primary"
                            onClick={handleNetworkCalculation}
                            size="small"
                            style={{ flex: 'none' }}
                        >
                            计算
                        </Button>
                        <Button
                            onClick={handleClear}
                            size="small"
                            style={{ flex: 'none' }}
                        >
                            清除
                        </Button>
                        <Button
                            onClick={handleCopyAll}
                            size="small"
                            disabled={!networkResult}
                            style={{ flex: 'none' }}
                        >
                            复制全部
                        </Button>
                    </div>
                </div>

                {networkResult && (
                    <div>
                        <Divider style={{ margin: '10px 0' }} />
                        <Row gutter={[6, 6]}>
                            <Col xs={12} sm={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>可用地址</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{networkResult.usableHosts}</Text>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>掩码</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{networkMask}</Text>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>网络</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{networkResult.network}</Text>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>第一个可用</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{networkResult.firstHost}</Text>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>最后可用</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{networkResult.lastHost}</Text>
                                </div>
                            </Col>
                            <Col xs={12} sm={8}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>广播</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{networkResult.broadcast}</Text>
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}
            </Space>
        </Card>
    );
}
// 通过主机数量计算子网掩码
import { useState, useEffect } from 'react';
import { Card, InputNumber, Space, Typography, Row, Col, Divider } from 'antd';
import { getMaskFromHostCount, getCIDRFromMask, calculateNetworkInfo } from '../../../services/ipUtils';
const { Text } = Typography;
export default function HostCountToMaskConverter() {
    const [hostCount, setHostCount] = useState(254);
    const [maskFromHosts, setMaskFromHosts] = useState('255.255.255.0');
    const [cidrBits, setCidrBits] = useState(24);
    const [usableHosts, setUsableHosts] = useState(254);

    useEffect(() => {
        const mask = getMaskFromHostCount(hostCount);
        setMaskFromHosts(mask);
        
        const cidr = getCIDRFromMask(mask);
        setCidrBits(cidr);
        
        // 使用一个示例IP来计算可用主机数量
        const networkInfo = calculateNetworkInfo('192.168.1.1', mask);
        setUsableHosts(networkInfo.usableHosts);
    }, [hostCount]);

    return (
        <Card 
            title="通过主机数量计算子网掩码" 
            size="small"
            headStyle={{ background: '#f6ffed', fontSize: '14px' }}
            bodyStyle={{ padding: '12px' }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>需要地址的数量：</Text>
                    <div style={{ marginTop: '6px' }}>
                        <InputNumber
                            min={2}
                            max={16777214}
                            value={hostCount}
                            onChange={(value) => setHostCount(value || 2)}
                            placeholder="例如: 100"
                            size="small"
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <Row gutter={[8, 8]}>
                    <Col span={8}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '11px', color: '#666' }}>掩码位数</Text>
                            <Text code style={{ fontSize: '10px' }}>{cidrBits}</Text>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '11px', color: '#666' }}>子网掩码</Text>
                            <Text code copyable style={{ fontSize: '10px' }}>{maskFromHosts}</Text>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '11px', color: '#666' }}>可用地址数</Text>
                            <Text code style={{ fontSize: '10px' }}>{usableHosts}</Text>
                        </div>
                    </Col>
                </Row>
            </Space>
        </Card>
    );
}
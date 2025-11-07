// 子网掩码逆算
import { useState, useEffect } from 'react';
import { Card, Input, Space, Typography, Row, Col, Divider } from 'antd';
const { Text } = Typography;
export default function WildcardMaskConverter() {
    const [wildcardMask, setWildcardMask] = useState('0.0.0.255');
    const [maskFromWildcard, setMaskFromWildcard] = useState('255.255.255.0');

    useEffect(() => {
        const parts = wildcardMask.split('.').map(Number);
        const maskParts = parts.map(part => 255 - part);
        setMaskFromWildcard(maskParts.join('.'));
    }, [wildcardMask]);

    return (
        <Card
            title="子网掩码逆算"
            size="small"
            styles={{ header: { background: '#f6ffed', fontSize: '14px' }, body: { padding: '12px' } }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>反掩码（Wildcard Mask）：</Text>
                    <div style={{ marginTop: '6px' }}>
                        <Input
                            value={wildcardMask}
                            onChange={(e) => setWildcardMask(e.target.value)}
                            placeholder="例如: 0.0.0.255"
                            size="small"
                        />
                    </div>
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <Row gutter={[8, 8]}>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>反掩码</Text>
                            <Text code copyable style={{ fontSize: '12px' }}>{wildcardMask}</Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>子网掩码</Text>
                            <Text code copyable style={{ fontSize: '12px' }}>{maskFromWildcard}</Text>
                        </div>
                    </Col>
                </Row>
            </Space>
        </Card>
    );
}
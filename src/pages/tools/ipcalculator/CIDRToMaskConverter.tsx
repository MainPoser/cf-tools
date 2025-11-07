// 通过掩码位元数计算子网掩码
import { useState, useEffect } from 'react';
import { Card, Slider, Space, Typography, Row, Col, Divider } from 'antd';
import { getMaskFromCIDR } from '../../../services/ipUtils';

const { Text } = Typography;

export default function CIDRToMaskConverter() {
    const [cidrBits, setCidrBits] = useState(24);
    const [maskFromBits, setMaskFromBits] = useState('255.255.255.0');
    const [totalAddresses, setTotalAddresses] = useState(256);
    const [usableAddresses, setUsableAddresses] = useState(254);
    const [decimalMask, setDecimalMask] = useState('255.255.255.0');
    const [hexMask, setHexMask] = useState('FF.FF.FF.00');

    useEffect(() => {
        const mask = getMaskFromCIDR(cidrBits);
        setMaskFromBits(mask);
        
        // 计算地址总数
        const total = Math.pow(2, 32 - cidrBits);
        setTotalAddresses(total);
        
        // 计算可用地址数量（减去网络地址和广播地址）
        if (cidrBits >= 31) {
            // /31和/32子网没有可用的主机地址
            setUsableAddresses(0);
        } else if (cidrBits === 30) {
            // /30子网有2个可用地址
            setUsableAddresses(2);
        } else {
            setUsableAddresses(total - 2);
        }
        
        // 计算十进制和十六进制子网掩码（每个八位字节分别转换）
        const parts = mask.split('.').map(Number);
        setDecimalMask(mask); // 十进制就是原始的点分十进制格式
        
        // 十六进制：每个八位字节转换为两位十六进制
        const hexParts = parts.map(part => part.toString(16).toUpperCase().padStart(2, '0'));
        setHexMask(hexParts.join('.'));
    }, [cidrBits]);

    const marks = {
        8: '/8',
        16: '/16',
        24: '/24',
        30: '/30'
    };

    // 格式化大数字显示
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    return (
        <Card 
            title="通过掩码位元数计算子网掩码" 
            size="small"
            styles={{header: { background: '#f6ffed', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>CIDR位数：{cidrBits}</Text>
                    <Slider
                        min={0}
                        max={32}
                        value={cidrBits}
                        onChange={setCidrBits}
                        marks={marks}
                        style={{ marginTop: '6px' }}
                        tooltip={{ formatter: (value) => `/${value}` }}
                    />
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <Row gutter={[8, 8]}>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>CIDR表示法</Text>
                            <Text code copyable style={{ fontSize: '12px' }}>/{cidrBits}</Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>子网掩码</Text>
                            <Text code copyable style={{ fontSize: '12px' }}>{maskFromBits}</Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>十进制掩码</Text>
                            <Text code copyable style={{ fontSize: '12px' }}>{decimalMask}</Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>十六进制掩码</Text>
                            <Text code copyable style={{ fontSize: '12px' }}>{hexMask}</Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>地址总数</Text>
                            <Text code style={{ fontSize: '12px' }}>{formatNumber(totalAddresses)}</Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: '12px', color: '#666' }}>可用地址数</Text>
                            <Text code style={{ fontSize: '12px' }}>{formatNumber(usableAddresses)}</Text>
                        </div>
                    </Col>
                </Row>
            </Space>
        </Card>
    );
}
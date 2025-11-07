// IP地址进制转换器
import { useState } from 'react';
import { Card, Input, Row, Col, Typography, Space } from 'antd';
import { useAutoTrackVisit } from '../../../hooks/useAnalytics';

const { Text } = Typography;

interface IPAddress {
    decimal: [string, string, string, string];
    binary: [string, string, string, string];
    hex: [string, string, string, string];
    long: string;
}

export default function IPBaseConverter() {
    useAutoTrackVisit('IP地址进制转换器');

    const [ipAddress, setIPAddress] = useState<IPAddress>({
        decimal: ['192', '168', '100', '1'],
        binary: ['11000000', '10101000', '01100100', '00000001'],
        hex: ['C0', 'A8', '64', '01'],
        long: '3232261121'
    });

    // 转换函数
    const decimalToBinary = (decimal: number): string => {
        return decimal.toString(2).padStart(8, '0');
    };

    const decimalToHex = (decimal: number): string => {
        return decimal.toString(16).toUpperCase().padStart(2, '0');
    };

    const decimalToLong = (decimalParts: [string, string, string, string]): string => {
        const parts = decimalParts.map(part => parseInt(part) || 0);
        if (parts.some(part => part < 0 || part > 255)) return '';
        return ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]).toString();
    };

    const binaryToDecimal = (binary: string): number => {
        return parseInt(binary, 2) || 0;
    };

    const hexToDecimal = (hex: string): number => {
        return parseInt(hex, 16) || 0;
    };

    const longToDecimal = (long: string): [string, string, string, string] => {
        const num = parseInt(long) || 0;
        return [
            ((num >>> 24) & 255).toString(),
            ((num >>> 16) & 255).toString(),
            ((num >>> 8) & 255).toString(),
            (num & 255).toString()
        ];
    };

    // 更新所有格式
    const updateFromDecimal = () => {
        const newIP = { ...ipAddress };
        const decimalParts = newIP.decimal.map(part => parseInt(part) || 0) as [number, number, number, number];

        if (decimalParts.some(part => part < 0 || part > 255)) {
            return;
        }

        newIP.binary = decimalParts.map(part => decimalToBinary(part)) as [string, string, string, string];
        newIP.hex = decimalParts.map(part => decimalToHex(part)) as [string, string, string, string];
        newIP.long = decimalToLong(newIP.decimal);

        setIPAddress(newIP);
    };

    const updateFromBinary = () => {
        const newIP = { ...ipAddress };
        const binaryParts = newIP.binary.map(part => part.padStart(8, '0'));

        if (binaryParts.some(part => !/^[01]{8}$/.test(part))) {
            return;
        }

        const decimalParts = binaryParts.map(part => binaryToDecimal(part));
        newIP.decimal = decimalParts.map(part => part.toString()) as [string, string, string, string];
        newIP.hex = decimalParts.map(part => decimalToHex(part)) as [string, string, string, string];
        newIP.long = decimalToLong(newIP.decimal);

        setIPAddress(newIP);
    };

    const updateFromHex = () => {
        const newIP = { ...ipAddress };
        const hexParts = newIP.hex.map(part => part.padStart(2, '0'));

        if (hexParts.some(part => !/^[0-9A-Fa-f]{2}$/.test(part))) {
            return;
        }

        const decimalParts = hexParts.map(part => hexToDecimal(part));
        newIP.decimal = decimalParts.map(part => part.toString()) as [string, string, string, string];
        newIP.binary = decimalParts.map(part => decimalToBinary(part)) as [string, string, string, string];
        newIP.long = decimalToLong(newIP.decimal);

        setIPAddress(newIP);
    };

    const updateFromLong = () => {
        const newIP = { ...ipAddress };
        const longNum = parseInt(newIP.long) || 0;

        if (longNum < 0 || longNum > 4294967295) {
            return;
        }

        newIP.decimal = longToDecimal(newIP.long);
        const decimalParts = newIP.decimal.map(part => parseInt(part) || 0) as [number, number, number, number];
        newIP.binary = decimalParts.map(part => decimalToBinary(part)) as [string, string, string, string];
        newIP.hex = decimalParts.map(part => decimalToHex(part)) as [string, string, string, string];

        setIPAddress(newIP);
    };

    const handleDecimalChange = (index: number, value: string) => {
        const newIP = { ...ipAddress };
        newIP.decimal[index] = value;
        setIPAddress(newIP);
    };

    const handleBinaryChange = (index: number, value: string) => {
        const newIP = { ...ipAddress };
        newIP.binary[index] = value;
        setIPAddress(newIP);
    };

    const handleHexChange = (index: number, value: string) => {
        const newIP = { ...ipAddress };
        newIP.hex[index] = value;
        setIPAddress(newIP);
    };

    const handleLongChange = (value: string) => {
        const newIP = { ...ipAddress };
        newIP.long = value;
        setIPAddress(newIP);
    };

    return (
        <Card
            title="IP地址进制转换器"
            size="small"
            styles={{header: { background: '#f9f0ff', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* 十进制 TCP/IP 地址 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>十进制 TCP/IP 地址</Text>
                    <Row gutter={4} style={{ marginTop: '6px' }}>
                        <Col span={5}>
                            <Input
                                value={ipAddress.decimal[0]}
                                onChange={(e) => handleDecimalChange(0, e.target.value)}
                                placeholder="192"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromDecimal}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.decimal[1]}
                                onChange={(e) => handleDecimalChange(1, e.target.value)}
                                placeholder="168"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromDecimal}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.decimal[2]}
                                onChange={(e) => handleDecimalChange(2, e.target.value)}
                                placeholder="100"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromDecimal}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.decimal[3]}
                                onChange={(e) => handleDecimalChange(3, e.target.value)}
                                placeholder="1"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromDecimal}
                            />
                        </Col>
                    </Row>
                </div>

                {/* 二进制地址 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>二进制地址</Text>
                    <Row gutter={4} style={{ marginTop: '6px' }}>
                        <Col span={5}>
                            <Input
                                value={ipAddress.binary[0]}
                                onChange={(e) => handleBinaryChange(0, e.target.value)}
                                placeholder="11000000"
                                size="small"
                                style={{ textAlign: 'center', fontSize: '10px' }}
                                onBlur={updateFromBinary}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.binary[1]}
                                onChange={(e) => handleBinaryChange(1, e.target.value)}
                                placeholder="10101000"
                                size="small"
                                style={{ textAlign: 'center', fontSize: '10px' }}
                                onBlur={updateFromBinary}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.binary[2]}
                                onChange={(e) => handleBinaryChange(2, e.target.value)}
                                placeholder="01100100"
                                size="small"
                                style={{ textAlign: 'center', fontSize: '10px' }}
                                onBlur={updateFromBinary}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.binary[3]}
                                onChange={(e) => handleBinaryChange(3, e.target.value)}
                                placeholder="00000001"
                                size="small"
                                style={{ textAlign: 'center', fontSize: '10px' }}
                                onBlur={updateFromBinary}
                            />
                        </Col>
                    </Row>
                </div>

                {/* 十六进制地址 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>十六进制地址</Text>
                    <Row gutter={4} style={{ marginTop: '6px' }}>
                        <Col span={5}>
                            <Input
                                value={ipAddress.hex[0]}
                                onChange={(e) => handleHexChange(0, e.target.value)}
                                placeholder="C0"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromHex}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.hex[1]}
                                onChange={(e) => handleHexChange(1, e.target.value)}
                                placeholder="A8"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromHex}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.hex[2]}
                                onChange={(e) => handleHexChange(2, e.target.value)}
                                placeholder="64"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromHex}
                            />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text strong>.</Text>
                        </Col>
                        <Col span={5}>
                            <Input
                                value={ipAddress.hex[3]}
                                onChange={(e) => handleHexChange(3, e.target.value)}
                                placeholder="01"
                                size="small"
                                style={{ textAlign: 'center' }}
                                onBlur={updateFromHex}
                            />
                        </Col>
                    </Row>
                </div>

                {/* 长整型数字 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>长整型数字</Text>
                    <div style={{ marginTop: '6px' }}>
                        <Input
                            value={ipAddress.long}
                            onChange={(e) => handleLongChange(e.target.value)}
                            placeholder="3232261121"
                            size="small"
                            style={{ textAlign: 'center' }}
                            onBlur={updateFromLong}
                        />
                    </div>
                </div>
            </Space>
        </Card>
    );
}
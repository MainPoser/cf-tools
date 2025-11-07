// IPv6地址计算器
import React, { useState } from 'react';
import { Card, Input, Button, Slider, Typography, Row, Col, Divider, Space } from 'antd';
import { useAutoTrackVisit } from '../../../hooks/useAnalytics';

const { Text } = Typography;

interface IPv6Address {
    compressed: string;
    full: string;
    decimal: string;
}

interface IPv6Range {
    segments: string[];
    prefixLength: number;
    range: {
        start: string;
        end: string;
    };
}

export default function IPv6Calculator() {
    useAutoTrackVisit('IPv6地址计算器');

    const [ipv6Address, setIPv6Address] = useState<IPv6Address>({
        compressed: '',
        full: '',
        decimal: ''
    });

    const [ipv6Format, setIPv6Format] = useState({
        full: '',
        compressed: ''
    });

    const [ipv6Range, setIPv6Range] = useState<IPv6Range>({
        segments: ['2001', '4860', '0000', '0000', '0000', '0000', '0000', '0000'],
        prefixLength: 64,
        range: {
            start: '',
            end: ''
        }
    });

    // IPv6地址验证
    const isValidIPv6 = (address: string): boolean => {
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9]))$/;
        return ipv6Regex.test(address);
    };

    // 扩展IPv6地址
    const expandIPv6 = (compressed: string): string => {
        if (!isValidIPv6(compressed)) return compressed;

        // 处理 :: 的情况
        const parts = compressed.split('::');
        if (parts.length === 2) {
            const leftParts = parts[0] ? parts[0].split(':') : [];
            const rightParts = parts[1] ? parts[1].split(':') : [];
            const missingParts = 8 - leftParts.length - rightParts.length;
            const middleParts = Array(missingParts).fill('0000');
            const allParts = [...leftParts, ...middleParts, ...rightParts];
            return allParts.map(part => part.padStart(4, '0')).join(':');
        } else {
            // 没有 :: 的情况
            return compressed.split(':').map(part => part.padStart(4, '0')).join(':');
        }
    };

    // 压缩IPv6地址
    const compressIPv6 = (full: string): string => {
        if (!isValidIPv6(full)) return full;

        // 先移除前导零
        const parts = full.split(':').map(part => part.replace(/^0+/, '') || '0');

        // 找到最长的连续零序列
        let maxZeroStart = -1;
        let maxZeroLength = 0;
        let currentZeroStart = -1;
        let currentZeroLength = 0;

        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === '0') {
                if (currentZeroStart === -1) {
                    currentZeroStart = i;
                }
                currentZeroLength++;
            } else {
                if (currentZeroLength > maxZeroLength) {
                    maxZeroStart = currentZeroStart;
                    maxZeroLength = currentZeroLength;
                }
                currentZeroStart = -1;
                currentZeroLength = 0;
            }
        }

        // 检查末尾的零序列
        if (currentZeroLength > maxZeroLength) {
            maxZeroStart = currentZeroStart;
            maxZeroLength = currentZeroLength;
        }

        // 如果找到零序列，用 :: 替换
        if (maxZeroLength > 1) {
            const compressedParts = [
                ...parts.slice(0, maxZeroStart),
                '',
                ...parts.slice(maxZeroStart + maxZeroLength)
            ];
            return compressedParts.join(':');
        }

        return parts.join(':');
    };

    // IPv6转十进制
    const ipv6ToDecimal = (ipv6: string): string => {
        if (!isValidIPv6(ipv6)) return '0';

        const expanded = expandIPv6(ipv6);
        const parts = expanded.split(':');
        let decimal = BigInt(0);

        for (let i = 0; i < parts.length; i++) {
            decimal = decimal * BigInt(65536) + BigInt(parseInt(parts[i], 16));
        }

        return decimal.toString();
    };

    // 十进制转IPv6
    const decimalToIPv6 = (decimal: string): string => {
        try {
            let num = BigInt(decimal);
            const parts: string[] = [];

            for (let i = 0; i < 8; i++) {
                parts.unshift((num % BigInt(65536)).toString(16).padStart(4, '0'));
                num = num / BigInt(65536);
            }

            return compressIPv6(parts.join(':'));
        } catch {
            return '';
        }
    };

    // 处理IPv6地址输入 - 只更新输入值，不自动转换
    const handleIPv6Change = (value: string) => {
        setIPv6Address(prev => ({
            ...prev,
            compressed: value
        }));
    };

    // 处理十进制输入 - 只更新输入值，不自动转换
    const handleDecimalChange = (value: string) => {
        setIPv6Address(prev => ({
            ...prev,
            decimal: value
        }));
    };

    // 手动执行IPv6地址与数字转换
    const performIPv6ToDecimalConversion = () => {
        const { compressed, decimal } = ipv6Address;
        
        // 如果IPv6地址有效，从IPv6转换为十进制
        if (compressed && isValidIPv6(compressed)) {
            const expanded = expandIPv6(compressed);
            const decimalValue = ipv6ToDecimal(compressed);
            setIPv6Address({
                compressed: compressIPv6(compressed),
                full: expanded,
                decimal: decimalValue
            });
        }
        // 如果十进制数字有效，从十进制转换为IPv6
        else if (decimal) {
            const ipv6 = decimalToIPv6(decimal);
            if (ipv6) {
                const expanded = expandIPv6(ipv6);
                setIPv6Address({
                    compressed: ipv6,
                    full: expanded,
                    decimal
                });
            }
        }
        // 如果输入为空，清空所有字段
        else {
            setIPv6Address({
                compressed: '',
                full: '',
                decimal: ''
            });
        }
    };

    // 处理扩展地址输入 - 只更新输入值，不自动转换
    const handleFullChange = (value: string) => {
        setIPv6Format(prev => ({
            ...prev,
            full: value
        }));
    };

    // 处理压缩地址输入 - 只更新输入值，不自动转换
    const handleCompressedChange = (value: string) => {
        setIPv6Format(prev => ({
            ...prev,
            compressed: value
        }));
    };

    // 手动执行扩展与压缩转换
    const performFormatConversion = () => {
        const { full, compressed } = ipv6Format;
        
        // 如果完整地址有效，转换为压缩格式
        if (full && isValidIPv6(full)) {
            const compressedValue = compressIPv6(full);
            setIPv6Format({
                full: expandIPv6(full),
                compressed: compressedValue
            });
        }
        // 如果压缩地址有效，转换为完整格式
        else if (compressed && isValidIPv6(compressed)) {
            const expanded = expandIPv6(compressed);
            setIPv6Format({
                full: expanded,
                compressed: compressIPv6(compressed)
            });
        }
        // 如果输入为空，清空所有字段
        else {
            setIPv6Format({
                full: '',
                compressed: ''
            });
        }
    };

    // 处理地址范围段输入
    const handleSegmentChange = (index: number, value: string) => {
        const newSegments = [...ipv6Range.segments];
        newSegments[index] = value.toUpperCase();
        setIPv6Range(prev => ({
            ...prev,
            segments: newSegments
        }));
    };

    // 处理前缀长度变化
    const handlePrefixLengthChange = (value: number) => {
        setIPv6Range(prev => ({
            ...prev,
            prefixLength: value
        }));
    };

    // 计算IPv6地址范围
    const calculateIPv6Range = () => {
        try {
            const segments = ipv6Range.segments.map(seg => parseInt(seg, 16) || 0);
            let startBigInt = BigInt(0);
            let endBigInt = BigInt(0);

            // 构建128位地址
            for (let i = 0; i < 8; i++) {
                startBigInt = startBigInt * BigInt(65536) + BigInt(segments[i]);
            }

            // 计算网络掩码
            const maskBits = 128 - ipv6Range.prefixLength;
            const mask = (BigInt(1) << BigInt(maskBits)) - BigInt(1);

            // 计算起始和结束地址
            startBigInt = startBigInt & ~mask;
            endBigInt = startBigInt | mask;

            // 转换回IPv6格式
            const startParts: string[] = [];
            const endParts: string[] = [];
            let startTemp = startBigInt;
            let endTemp = endBigInt;

            for (let i = 0; i < 8; i++) {
                startParts.unshift((startTemp % BigInt(65536)).toString(16).padStart(4, '0'));
                endParts.unshift((endTemp % BigInt(65536)).toString(16).padStart(4, '0'));
                startTemp = startTemp / BigInt(65536);
                endTemp = endTemp / BigInt(65536);
            }

            setIPv6Range(prev => ({
                ...prev,
                range: {
                    start: compressIPv6(startParts.join(':')),
                    end: compressIPv6(endParts.join(':'))
                }
            }));
        } catch (error) {
            console.error('计算地址范围失败:', error);
        }
    };

    return (
        <Card
            title="IPv6地址计算器"
            size="small"
            styles={{header: { background: '#fff1f0', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* IPv6地址与数字转换 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>IPv6地址与数字转换</Text>
                    <Row gutter={4} style={{ marginTop: '8px' }}>
                        <Col span={8}>
                            <Input
                                value={ipv6Address.compressed}
                                onChange={(e) => handleIPv6Change(e.target.value)}
                                placeholder="2001:4860::8888"
                                size="small"
                            />
                        </Col>
                        <Col span={8}>
                            <Input
                                value={ipv6Address.decimal}
                                onChange={(e) => handleDecimalChange(e.target.value)}
                                placeholder="4254195612376984603617138956568135816"
                                size="small"
                            />
                        </Col>
                        <Col span={8}>
                            <Input
                                value={ipv6Address.full}
                                readOnly
                                placeholder="完整地址"
                                size="small"
                                style={{ background: '#f5f5f5', fontSize: '12px' }}
                            />
                        </Col>
                    </Row>
                    <Button
                        type="primary"
                        onClick={performIPv6ToDecimalConversion}
                        size="small"
                        style={{ width: '100%', marginTop: '8px' }}
                    >
                        执行转换
                    </Button>
                </div>

                <Divider style={{ margin: '10px 0' }} />

                {/* IPv6扩展与压缩转换 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>IPv6扩展与压缩转换</Text>
                    <Row gutter={4} style={{ marginTop: '8px' }}>
                        <Col span={12}>
                            <Input
                                value={ipv6Format.full}
                                onChange={(e) => handleFullChange(e.target.value)}
                                placeholder="2001:4860:0000:0000:0000:0000:0000:8888"
                                size="small"
                            />
                        </Col>
                        <Col span={12}>
                            <Input
                                value={ipv6Format.compressed}
                                onChange={(e) => handleCompressedChange(e.target.value)}
                                placeholder="2001:4860::8888"
                                size="small"
                            />
                        </Col>
                    </Row>
                    <Button
                        type="primary"
                        onClick={performFormatConversion}
                        size="small"
                        style={{ width: '100%', marginTop: '8px' }}
                    >
                        执行转换
                    </Button>
                </div>

                <Divider style={{ margin: '10px 0' }} />

                {/* IPv6地址范围计算 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>IPv6地址范围计算</Text>
                    <div style={{ marginTop: '8px' }}>
                        <Row gutter={[2, 2]}>
                            {ipv6Range.segments.map((segment, index) => (
                                <React.Fragment key={index}>
                                    <Col span={2}>
                                        <Input
                                            value={segment}
                                            onChange={(e) => handleSegmentChange(index, e.target.value)}
                                            placeholder="FFFF"
                                            size="small"
                                            style={{ textAlign: 'center', fontSize: '10px' }}
                                            maxLength={4}
                                        />
                                    </Col>
                                    {index < 7 && (
                                        <Col span={1} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text strong>:</Text>
                                        </Col>
                                    )}
                                </React.Fragment>
                            ))}
                        </Row>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <Text strong style={{ fontSize: '11px', color: '#666' }}>前缀长度: {ipv6Range.prefixLength}</Text>
                        <Slider
                            min={0}
                            max={128}
                            value={ipv6Range.prefixLength}
                            onChange={handlePrefixLengthChange}
                            marks={{
                                0: '0',
                                32: '32',
                                64: '64',
                                96: '96',
                                128: '128'
                            }}
                            style={{ marginTop: '8px' }}
                        />
                    </div>

                    <Button
                        type="primary"
                        onClick={calculateIPv6Range}
                        size="small"
                        style={{ width: '100%', marginTop: '8px' }}
                    >
                        计算地址范围
                    </Button>

                    {(ipv6Range.range.start || ipv6Range.range.end) && (
                        <Row gutter={4} style={{ marginTop: '8px' }}>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>起始地址</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{ipv6Range.range.start}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>结束地址</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{ipv6Range.range.end}</Text>
                                </div>
                            </Col>
                        </Row>
                    )}
                    <Divider style={{ margin: '10px 0' }} />

                    {/* IPv6地址说明 */}
                    <div style={{
                        background: '#fafafa',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #f0f0f0'
                    }}>
                        <Text strong style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px' }}>
                            什么是IPv6地址？
                        </Text>

                        <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#555' }}>
                            <p style={{ margin: '0 0 8px 0' }}>
                                IPv4地址是类似 A.B.C.D 的格式，它是32位，用"."分成四段，用10进制表示；
                                而IPv6地址类似X:X:X:X:X:X:X:X的格式，它是128位的，用":"分成8段，用16进制表示；
                                可见，IPv6地址空间相对于IPv4地址有了极大的扩充。
                            </p>

                            <p style={{ margin: '0 0 8px 0' }}>
                                RFC2373 中详细定义了IPv6地址，按照定义，一个完整的IPv6地址的表示法：
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0' }}>xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx</Text>
                            </p>

                            <p style={{ margin: '0 0 8px 0' }}>
                                类似于 IPv4中的CDIR表示法，IPv6用前缀来表示网络地址空间，比如：
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0' }}>2001:251:e000::/48</Text>
                                表示前缀为48位的地址空间，其后的80位可分配给网络中的主机，共有2的80次方个地址。
                            </p>

                            <Text strong style={{ fontSize: '12px', color: '#666', display: 'block', margin: '12px 0 8px 0' }}>
                                IPv6地址的表示方法
                            </Text>

                            <p style={{ margin: '0 0 6px 0' }}>
                                IPv6的地址长度为128位，是IPv4地址长度的4倍。于是IPv4点分十进制格式不再适用，采用十六进制表示。IPv6有3种表示方法。
                            </p>

                            <div style={{ marginLeft: '12px', marginBottom: '8px' }}>
                                <Text strong style={{ fontSize: '12px', color: '#666' }}>（1）冒分十六进制表示法</Text>
                                <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                    格式为X:X:X:X:X:X:X:X，其中每个X表示地址中的16b，以十六进制表示，例如：
                                </p>
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0', display: 'block', margin: '4px 0' }}>
                                    ABCD:EF01:2345:6789:ABCD:EF01:2345:6789
                                </Text>
                                <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                    这种表示法中，每个X的前导0是可以省略的，例如：
                                </p>
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0', display: 'block', margin: '4px 0' }}>
                                    2001:0DB8:0000:0023:0008:0800:200C:417A → 2001:DB8:0:23:8:800:200C:417A
                                </Text>
                            </div>

                            <div style={{ marginLeft: '12px', marginBottom: '8px' }}>
                                <Text strong style={{ fontSize: '12px', color: '#666' }}>（2）0位压缩表示法</Text>
                                <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                    在某些情况下，一个IPv6地址中间可能包含很长的一段0，可以把连续的一段0压缩为"::"。
                                    但为保证地址解析的唯一性，地址中"::"只能出现一次，例如：
                                </p>
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0', display: 'block', margin: '4px 0' }}>
                                    FF01:0:0:0:0:0:0:1101 → FF01::1101
                                </Text>
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0', display: 'block', margin: '4px 0' }}>
                                    0:0:0:0:0:0:0:1 → ::1
                                </Text>
                                <Text code style={{ fontSize: '12px', background: '#f0f0f0', display: 'block', margin: '4px 0' }}>
                                    0:0:0:0:0:0:0:0 → ::
                                </Text>
                            </div>

                            <div style={{ marginLeft: '12px' }}>
                                <Text strong style={{ fontSize: '12px', color: '#666' }}>（3）内嵌IPv4地址表示法</Text>
                                <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                    为了实现IPv4-IPv6互通，IPv4地址会嵌入IPv6地址中，此时地址常表示为：
                                    X:X:X:X:X:X:d.d.d.d，前96b采用冒分十六进制表示，而最后32b地址则使用IPv4的点分十进制表示。
                                </p>
                                <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                    例如<Text code style={{ fontSize: '12px', background: '#f0f0f0' }}>::192.168.0.1</Text>与
                                    <Text code style={{ fontSize: '12px', background: '#f0f0f0' }}>::FFFF:192.168.0.1</Text>
                                    就是两个典型的例子，注意在前96b中，压缩0位的方法依旧适用。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Space>
        </Card>
    );
}
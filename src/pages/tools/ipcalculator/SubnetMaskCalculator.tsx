// 子网掩码计算器
import { useState } from 'react';
import { Card, Input, Button, Select, Radio, Space, Typography, Row, Col, Divider, Modal, message } from 'antd';
import { useAutoTrackVisit } from '../../../hooks/useAnalytics';

const { Text } = Typography;

interface SubnetResult {
    networkType: string;
    subnetMask: string;
    cidr: string;
    subnetCount: number;
    hostsPerSubnet: number;
}

export default function SubnetMaskCalculator() {
    useAutoTrackVisit('子网掩码计算器');

    const [ip1, setIp1] = useState('192');
    const [ip2, setIp2] = useState('168');
    const [ip3, setIp3] = useState('100');
    const [ip4, setIp4] = useState('1');
    const [networkType, setNetworkType] = useState('default');
    const [subnetIPCount, setSubnetIPCount] = useState<number | undefined>(4);
    const [hostsPerNetwork, setHostsPerNetwork] = useState<number | undefined>(undefined);
    const [result, setResult] = useState<SubnetResult | null>(null);
    const [networkListVisible, setNetworkListVisible] = useState(false);

    // 子网IP数量选项
    const subnetIPCountOptions = [
        { label: '2个子网', value: 2 },
        { label: '4个子网', value: 4 },
        { label: '8个子网', value: 8 },
        { label: '16个子网', value: 16 },
        { label: '32个子网', value: 32 },
        { label: '64个子网', value: 64 },
        { label: '128个子网', value: 128 },
        { label: '256个子网', value: 256 },
    ];

    // 每个网络节点数选项
    const hostsPerNetworkOptions = [
        { label: '2个节点', value: 2 },
        { label: '6个节点', value: 6 },
        { label: '14个节点', value: 14 },
        { label: '30个节点', value: 30 },
        { label: '62个节点', value: 62 },
        { label: '126个节点', value: 126 },
        { label: '254个节点', value: 254 },
        { label: '510个节点', value: 510 },
        { label: '1022个节点', value: 1022 },
        { label: '2046个节点', value: 2046 },
        { label: '4094个节点', value: 4094 },
        { label: '8190个节点', value: 8190 },
    ];

    // 验证IP地址
    const isValidIP = (ip: string): boolean => {
        const num = parseInt(ip);
        return !isNaN(num) && num >= 0 && num <= 255;
    };

    // 判断网络类型
    const getNetworkType = (ip1: string): string => {
        const firstOctet = parseInt(ip1);
        if (firstOctet >= 1 && firstOctet <= 126) return 'A类网';
        if (firstOctet >= 128 && firstOctet <= 191) return 'B类网';
        if (firstOctet >= 192 && firstOctet <= 223) return 'C类网';
        return '未知';
    };

    // 计算子网掩码
    const calculateSubnetMask = () => {
        // 验证IP地址
        if (!isValidIP(ip1) || !isValidIP(ip2) || !isValidIP(ip3) || !isValidIP(ip4)) {
            message.error('请输入有效的IP地址');
            return;
        }

        // 确定默认网络类型
        let defaultMaskBits = 24; // 默认C类
        if (networkType === 'A') defaultMaskBits = 8;
        else if (networkType === 'B') defaultMaskBits = 16;
        else if (networkType === 'C') defaultMaskBits = 24;
        else {
            // 根据IP地址自动判断
            const firstOctet = parseInt(ip1);
            if (firstOctet >= 1 && firstOctet <= 126) defaultMaskBits = 8;
            else if (firstOctet >= 128 && firstOctet <= 191) defaultMaskBits = 16;
            else if (firstOctet >= 192 && firstOctet <= 223) defaultMaskBits = 24;
        }

        let subnetBits = 0;
        let hostsPerSubnet = 0;

        if (subnetIPCount) {
            // 根据子网数量计算
            subnetBits = Math.ceil(Math.log2(subnetIPCount));
            hostsPerSubnet = Math.pow(2, 32 - (defaultMaskBits + subnetBits));
        } else if (hostsPerNetwork) {
            // 根据主机数量计算
            const neededBits = Math.ceil(Math.log2(hostsPerNetwork));
            subnetBits = 32 - defaultMaskBits - neededBits;
            hostsPerSubnet = Math.pow(2, neededBits);
        }

        const totalMaskBits = defaultMaskBits + subnetBits;
        const subnetMask = getMaskFromCIDR(totalMaskBits);
        const actualSubnetCount = Math.pow(2, subnetBits);

        setResult({
            networkType: getNetworkType(ip1),
            subnetMask,
            cidr: totalMaskBits.toString(),
            subnetCount: actualSubnetCount,
            hostsPerSubnet
        });

        message.success('计算完成');
    };

    // 根据CIDR获取子网掩码
    const getMaskFromCIDR = (cidr: number): string => {
        const mask = [];
        for (let i = 0; i < 4; i++) {
            const octet = Math.min(255, Math.max(0, (cidr - i * 8) > 0 ? (cidr - i * 8) >= 8 ? 255 : (256 - Math.pow(2, 8 - (cidr - i * 8))) : 0));
            mask.push(octet);
        }
        return mask.join('.');
    };

    // 清除输入
    const handleClear = () => {
        setIp1('192');
        setIp2('168');
        setIp3('100');
        setIp4('1');
        setNetworkType('default');
        setSubnetIPCount(4);
        setHostsPerNetwork(undefined);
        setResult(null);
        message.success('已清除');
    };

    // 计算网络列表
    const generateNetworkList = () => {
        if (!result) return [];

        const baseIP = `${ip1}.${ip2}.${ip3}.${ip4}`;
        const hostBits = 32 - parseInt(result.cidr);
        const subnetSize = Math.pow(2, hostBits);

        const networks = [];
        for (let i = 0; i < Math.min(result.subnetCount, 100); i++) {
            const networkAddress = calculateNetworkAddress(baseIP, result.subnetMask, i * subnetSize);
            const firstHost = calculateFirstHost(networkAddress, result.subnetMask);
            const lastHost = calculateLastHost(networkAddress, result.subnetMask);
            const broadcast = calculateBroadcast(networkAddress, result.subnetMask);

            networks.push({
                index: i + 1,
                network: networkAddress,
                firstHost,
                lastHost,
                broadcast
            });
        }

        return networks;
    };

    // 计算网络地址
    const calculateNetworkAddress = (ip: string, mask: string, offset: number = 0): string => {
        const ipParts = ip.split('.').map(Number);
        const maskParts = mask.split('.').map(Number);

        let networkAddress = 0;
        for (let i = 0; i < 4; i++) {
            networkAddress = (networkAddress << 8) | (ipParts[i] & maskParts[i]);
        }

        networkAddress += offset;

        const result = [];
        for (let i = 0; i < 4; i++) {
            result.unshift((networkAddress & 255) || 0);
            networkAddress >>= 8;
        }

        return result.join('.');
    };

    // 计算第一个可用主机地址
    const calculateFirstHost = (networkAddress: string, _mask: string): string => {
        const parts = networkAddress.split('.').map(Number);
        parts[3] += 1;
        return parts.join('.');
    };

    // 计算最后一个可用主机地址
    const calculateLastHost = (networkAddress: string, mask: string): string => {
        const networkParts = networkAddress.split('.').map(Number);
        const maskParts = mask.split('.').map(Number);

        const broadcastParts = networkParts.map((part, index) => part | (255 - maskParts[index]));
        broadcastParts[3] -= 1;

        return broadcastParts.join('.');
    };

    // 计算广播地址
    const calculateBroadcast = (networkAddress: string, mask: string): string => {
        const networkParts = networkAddress.split('.').map(Number);
        const maskParts = mask.split('.').map(Number);

        return networkParts.map((part, index) => part | (255 - maskParts[index])).join('.');
    };

    // 显示网络列表
    const showNetworkList = () => {
        setNetworkListVisible(true);
    };

    return (
        <Card
            title="子网掩码计算器"
            size="small"
            styles={{header: { background: '#fff7e6', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* IP地址输入 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>IP地址:</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <Input
                            value={ip1}
                            onChange={(e) => setIp1(e.target.value)}
                            size="small"
                            style={{ width: '50px' }}
                            placeholder="192"
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={ip2}
                            onChange={(e) => setIp2(e.target.value)}
                            size="small"
                            style={{ width: '50px' }}
                            placeholder="168"
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={ip3}
                            onChange={(e) => setIp3(e.target.value)}
                            size="small"
                            style={{ width: '50px' }}
                            placeholder="100"
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={ip4}
                            onChange={(e) => setIp4(e.target.value)}
                            size="small"
                            style={{ width: '50px' }}
                            placeholder="1"
                        />
                        <Button type="primary" onClick={calculateSubnetMask} size="small" style={{ flex: 'none' }}>
                            计算
                        </Button>
                        <Button onClick={handleClear} size="small" style={{ flex: 'none' }}>
                            清除
                        </Button>
                    </div>
                </div>

                {/* 网络类型选择 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>网络类型:</Text>
                    <div style={{ marginTop: '6px' }}>
                        <Radio.Group value={networkType} onChange={(e) => setNetworkType(e.target.value)} size="small">
                            <Radio.Button value="default">默认</Radio.Button>
                            <Radio.Button value="A">A类</Radio.Button>
                            <Radio.Button value="B">B类</Radio.Button>
                            <Radio.Button value="C">C类</Radio.Button>
                        </Radio.Group>
                    </div>
                </div>

                {/* 子网IP数量 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>子网数量:</Text>
                    <div style={{ marginTop: '6px' }}>
                        <Select
                            value={subnetIPCount}
                            onChange={(value) => {
                                setSubnetIPCount(value);
                                setHostsPerNetwork(undefined);
                            }}
                            style={{ width: '100%' }}
                            placeholder="选择数量"
                            size="small"
                            options={subnetIPCountOptions}
                        />
                    </div>
                </div>

                {/* 每个网络节点数 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>或每个网络节点数:</Text>
                    <div style={{ marginTop: '6px' }}>
                        <Select
                            value={hostsPerNetwork}
                            onChange={(value) => {
                                setHostsPerNetwork(value);
                                setSubnetIPCount(undefined);
                            }}
                            style={{ width: '100%' }}
                            placeholder="选择数量"
                            size="small"
                            options={hostsPerNetworkOptions}
                        />
                    </div>
                </div>

                {/* 计算结果区域 */}
                {result && (
                    <div>
                        <Divider style={{ margin: '10px 0' }} />
                        <Row gutter={[8, 8]}>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>网络类型</Text>
                                    <Text style={{ fontSize: '12px' }}>{result.networkType}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>子网掩码</Text>
                                    <Text code copyable style={{ fontSize: '12px' }}>{result.subnetMask}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>CIDR</Text>
                                    <Text code style={{ fontSize: '12px' }}>/{result.cidr}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>子网数量</Text>
                                    <Text style={{ fontSize: '12px' }}>{result.subnetCount}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>每个网络节点数</Text>
                                    <Text style={{ fontSize: '12px' }}>{result.hostsPerSubnet}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#666' }}>网络列表</Text>
                                    <Button onClick={showNetworkList} size="small" style={{ fontSize: '12px' }}>
                                        查看列表
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}

                {/* 网络列表弹窗 */}
                <Modal
                    title="网络列表"
                    open={networkListVisible}
                    onCancel={() => setNetworkListVisible(false)}
                    footer={null}
                    width={800}
                >
                    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                    <th style={{ border: '1px solid #d9d9d9', padding: '8px' }}>序号</th>
                                    <th style={{ border: '1px solid #d9d9d9', padding: '8px' }}>网络地址</th>
                                    <th style={{ border: '1px solid #d9d9d9', padding: '8px' }}>第一个可用IP</th>
                                    <th style={{ border: '1px solid #d9d9d9', padding: '8px' }}>最后一个可用IP</th>
                                    <th style={{ border: '1px solid #d9d9d9', padding: '8px' }}>广播地址</th>
                                </tr>
                            </thead>
                            <tbody>
                                {generateNetworkList().map((network, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1px solid #d9d9d9', padding: '8px', textAlign: 'center' }}>{network.index}</td>
                                        <td style={{ border: '1px solid #d9d9d9', padding: '8px' }}>
                                            <Text code copyable>{network.network}</Text>
                                        </td>
                                        <td style={{ border: '1px solid #d9d9d9', padding: '8px' }}>
                                            <Text code copyable>{network.firstHost}</Text>
                                        </td>
                                        <td style={{ border: '1px solid #d9d9d9', padding: '8px' }}>
                                            <Text code copyable>{network.lastHost}</Text>
                                        </td>
                                        <td style={{ border: '1px solid #d9d9d9', padding: '8px' }}>
                                            <Text code copyable>{network.broadcast}</Text>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Modal>
            </Space>
        </Card>
    );
}
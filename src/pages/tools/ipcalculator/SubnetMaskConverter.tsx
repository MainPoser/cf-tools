// 子网掩码换算器 - 十进制与CIDR双向转换
import { useState } from 'react';
import { Card, Input, Button, Space, Typography, Divider, message } from 'antd';
import { getMaskFromCIDR, getCIDRFromMask, isValidSubnetMask } from '../../../services/ipUtils';

const { Text } = Typography;

export default function SubnetMaskConverter() {
    // 十进制子网掩码状态
    const [mask1, setMask1] = useState('255');
    const [mask2, setMask2] = useState('255');
    const [mask3, setMask3] = useState('255');
    const [mask4, setMask4] = useState('252');

    // CIDR掩码位数状态
    const [cidrBits, setCidrBits] = useState('30');

    // 从十进制转换为CIDR
    const handleDecimalToCIDR = () => {
        const decimalMask = `${mask1}.${mask2}.${mask3}.${mask4}`;

        // 验证子网掩码
        if (!isValidSubnetMask(decimalMask)) {
            message.error('请输入有效的子网掩码');
            return;
        }

        const cidr = getCIDRFromMask(decimalMask);
        if (cidr === -1) {
            message.error('子网掩码格式错误');
            return;
        }

        setCidrBits(cidr.toString());
        message.success('转换完成');
    };

    // 从CIDR转换为十进制
    const handleCIDRToDecimal = () => {
        const bits = parseInt(cidrBits);

        // 验证CIDR位数
        if (isNaN(bits) || bits < 0 || bits > 32) {
            message.error('请输入有效的掩码位数 (0-32)');
            return;
        }

        const mask = getMaskFromCIDR(bits);
        const parts = mask.split('.');

        setMask1(parts[0]);
        setMask2(parts[1]);
        setMask3(parts[2]);
        setMask4(parts[3]);

        message.success('转换完成');
    };

    // 验证输入框数值
    const validateMaskInput = (value: string, max: number = 255): boolean => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0 && num <= max;
    };

    // 处理掩码输入框变化
    const handleMaskChange = (value: string, setter: (val: string) => void, _index: number) => {
        if (value === '' || validateMaskInput(value)) {
            setter(value);
        }
    };

    // 处理CIDR输入框变化
    const handleCIDRChange = (value: string) => {
        if (value === '' || validateMaskInput(value, 32)) {
            setCidrBits(value);
        }
    };

    // 清除所有输入
    const handleClear = () => {
        setMask1('255');
        setMask2('255');
        setMask3('255');
        setMask4('252');
        setCidrBits('30');
        message.success('已清除');
    };

    return (
        <Card 
            title="子网掩码换算器" 
            size="small"
            styles={{header: { background: '#f6ffed', fontSize: '14px' },body: { padding: '12px' }}}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* 十进制子网掩码输入区域 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>十进制子网掩码:</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <Input
                            value={mask1}
                            onChange={(e) => handleMaskChange(e.target.value, setMask1, 1)}
                            size="small"
                            style={{ width: '50px', flex: 'none' }}
                            placeholder="255"
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={mask2}
                            onChange={(e) => handleMaskChange(e.target.value, setMask2, 2)}
                            size="small"
                            style={{ width: '50px', flex: 'none' }}
                            placeholder="255"
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={mask3}
                            onChange={(e) => handleMaskChange(e.target.value, setMask3, 3)}
                            size="small"
                            style={{ width: '50px', flex: 'none' }}
                            placeholder="255"
                        />
                        <Text style={{ color: '#666' }}>.</Text>
                        <Input
                            value={mask4}
                            onChange={(e) => handleMaskChange(e.target.value, setMask4, 4)}
                            size="small"
                            style={{ width: '50px', flex: 'none' }}
                            placeholder="252"
                        />
                        <Button
                            type="primary"
                            onClick={handleDecimalToCIDR}
                            size="small"
                            style={{ flex: 'none' }}
                        >
                            计算
                        </Button>
                    </div>
                </div>

                <Divider style={{ margin: '10px 0' }} />

                {/* CIDR掩码位数输入区域 */}
                <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>掩码位元数 (CIDR 表示法):</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <Text style={{ color: '#666' }}>/</Text>
                        <Input
                            value={cidrBits}
                            onChange={(e) => handleCIDRChange(e.target.value)}
                            size="small"
                            style={{ width: '50px', flex: 'none' }}
                            placeholder="30"
                        />
                        <Button
                            type="primary"
                            onClick={handleCIDRToDecimal}
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
                    </div>
                </div>
            </Space>
        </Card>
    );
}
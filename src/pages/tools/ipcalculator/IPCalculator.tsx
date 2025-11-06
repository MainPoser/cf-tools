// IP地址计算器
import { Row, Col, Typography, Card } from 'antd';
import { useAutoTrackVisit } from '../../../hooks/useAnalytics';
import NetworkCalculator from './NetworkAndIPCalculator';
import CIDRToMaskConverter from './CIDRToMaskConverter';
import HostCountToMaskConverter from './HostCountToMaskConverter';
import WildcardMaskConverter from './WildcardMaskConverter';
import SubnetMaskCalculator from './SubnetMaskCalculator';
import NetworkNodeCalculator from './NetworkNodeCalculator';
import SubnetMaskConverter from './SubnetMaskConverter';
import IPBaseConverter from './IPBaseConverter';
import IPv6Calculator from './IPv6Calculator';

const { Title, Text } = Typography;

export default function IPCalculator() {
    useAutoTrackVisit('IP计算器');

    return (
        <div style={{ 
            padding: '16px', 
            background: '#f5f5f5', 
            minHeight: '100vh' 
        }}>
            <Title level={2} style={{ 
                textAlign: 'center', 
                marginBottom: '20px',
                color: '#1890ff',
                fontWeight: 'bold'
            }}>
                IP计算器
            </Title>

            {/* 核心网络计算 - 最重要功能放在顶部 */}
            <Card 
                title={
                    <Text strong style={{ color: '#1890ff' }}>
                        核心网络计算
                    </Text>
                } 
                size="small" 
                style={{ marginBottom: '16px' }}
                headStyle={{ background: '#e6f7ff', borderBottom: '2px solid #1890ff' }}
            >
                <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                        <NetworkCalculator />
                    </Col>
                    <Col xs={24} md={12}>
                        <SubnetMaskCalculator />
                    </Col>
                </Row>
            </Card>

            {/* 子网掩码转换工具组 */}
            <Card 
                title={
                    <Text strong style={{ color: '#52c41a' }}>
                        子网掩码转换工具
                    </Text>
                } 
                size="small" 
                style={{ marginBottom: '16px' }}
                headStyle={{ background: '#f6ffed', borderBottom: '2px solid #52c41a' }}
            >
                <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} lg={8}>
                        <CIDRToMaskConverter />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <HostCountToMaskConverter />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <WildcardMaskConverter />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <SubnetMaskConverter />
                    </Col>
                </Row>
            </Card>

            {/* 地址转换与分析工具组 */}
            <Card 
                title={
                    <Text strong style={{ color: '#722ed1' }}>
                        地址转换与分析工具
                    </Text>
                } 
                size="small" 
                style={{ marginBottom: '16px' }}
                headStyle={{ background: '#f9f0ff', borderBottom: '2px solid #722ed1' }}
            >
                <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                        <NetworkNodeCalculator />
                    </Col>
                    <Col xs={24} md={12}>
                        <IPBaseConverter />
                    </Col>
                </Row>
            </Card>

            {/* IPv6专用工具 - 独立区域 */}
            <Card 
                title={
                    <Text strong style={{ color: '#fa8c16' }}>
                        IPv6专用工具
                    </Text>
                } 
                size="small"
                headStyle={{ background: '#fff7e6', borderBottom: '2px solid #fa8c16' }}
            >
                <Row gutter={[12, 12]}>
                    <Col xs={24}>
                        <IPv6Calculator />
                    </Col>
                </Row>
            </Card>
        </div>
    );
}
// ... existing code ...
import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Select } from 'antd';
import { CopyOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function Timestamp() {
    // 自动统计页面访问
    useAutoTrackVisit('时间戳转换');

    const [timestamp, setTimestamp] = useState('');
    const [datetime, setDatetime] = useState('');
    const [currentTimestamp, setCurrentTimestamp] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [timestampUnit, setTimestampUnit] = useState<'seconds' | 'milliseconds'>('seconds');

    // 格式化日期时间
    const formatDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // 更新当前时间
    useEffect(() => {
        const updateCurrentTime = () => {
            const now = new Date();
            setCurrentTimestamp(Math.floor(now.getTime() / 1000).toString());
            setCurrentTime(formatDateTime(now));
        };

        updateCurrentTime();
        const interval = setInterval(updateCurrentTime, 1000);

        return () => clearInterval(interval);
    }, []);

    // 时间戳转日期
    const handleTimestampToDate = () => {
        if (!timestamp.trim()) {
            message.warning('请输入时间戳');
            return;
        }

        try {
            let timeValue = parseInt(timestamp.trim());
            
            // 根据单位转换时间戳
            if (timestampUnit === 'milliseconds') {
                timeValue = Math.floor(timeValue / 1000);
            }

            if (isNaN(timeValue)) {
                message.error('请输入有效的时间戳');
                return;
            }

            const date = new Date(timeValue * 1000);
            
            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                message.error('时间戳无效，请检查输入');
                return;
            }

            const formattedDate = formatDateTime(date);
            setDatetime(formattedDate);
            message.success('转换成功');
        } catch (error) {
            message.error('转换失败，请检查输入格式');
        }
    };

    // 日期转时间戳
    const handleDateToTimestamp = () => {
        if (!datetime.trim()) {
            message.warning('请输入日期时间');
            return;
        }

        try {
            const date = new Date(datetime.trim());
            
            // 检查日期是否有效
            if (isNaN(date.getTime())) {
                message.error('日期格式无效，请检查输入');
                return;
            }

            const timestampValue = Math.floor(date.getTime() / 1000);
            setTimestamp(timestampValue.toString());
            message.success('转换成功');
        } catch (error) {
            message.error('转换失败，请检查日期格式');
        }
    };

    // 使用当前时间戳
    const useCurrentTimestamp = () => {
        setTimestamp(currentTimestamp);
    };

    // 使用当前日期时间
    const useCurrentDateTime = () => {
        setDatetime(currentTime);
    };

    // 复制到剪贴板
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    // 清空
    const handleClear = () => {
        setTimestamp('');
        setDatetime('');
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>时间戳转换工具</Title>
            <Paragraph>
                支持时间戳与日期时间的相互转换，自动更新当前时间戳
            </Paragraph>

            {/* 当前时间显示 */}
            <Card title="当前时间" style={{ marginBottom: '16px', backgroundColor: '#f0f9ff' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Title level={4}>当前时间戳（秒）</Title>
                        <Input
                            value={currentTimestamp}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
                            addonAfter={
                                <Button 
                                    type="link" 
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopy(currentTimestamp)}
                                >
                                    复制
                                </Button>
                            }
                        />
                    </div>
                    <div>
                        <Title level={4}>当前日期时间</Title>
                        <Input
                            value={currentTime}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
                            addonAfter={
                                <Button 
                                    type="link" 
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopy(currentTime)}
                                >
                                    复制
                                </Button>
                            }
                        />
                    </div>
                </Space>
            </Card>

            {/* 时间戳转日期 */}
            <Card title="时间戳 → 日期时间" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>时间戳单位</Title>
                        <Select
                            value={timestampUnit}
                            onChange={setTimestampUnit}
                            style={{ width: '200px', marginBottom: '16px' }}
                        >
                            <Option value="seconds">秒（10位）</Option>
                            <Option value="milliseconds">毫秒（13位）</Option>
                        </Select>
                    </div>

                    <div>
                        <Title level={4}>输入时间戳</Title>
                        <Input
                            value={timestamp}
                            onChange={(e) => setTimestamp(e.target.value)}
                            placeholder="请输入时间戳..."
                            addonAfter={
                                <Button 
                                    type="link" 
                                    icon={<ClockCircleOutlined />}
                                    onClick={useCurrentTimestamp}
                                >
                                    使用当前
                                </Button>
                            }
                        />
                    </div>

                    <Space>
                        <Button type="primary" onClick={handleTimestampToDate}>
                            转换为日期时间
                        </Button>
                        <Button onClick={handleClear}>
                            清空
                        </Button>
                    </Space>

                    <div>
                        <Title level={4}>转换结果</Title>
                        <Input
                            value={datetime}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
                            placeholder="转换后的日期时间将显示在这里..."
                            addonAfter={
                                <Button 
                                    type="link" 
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopy(datetime)}
                                    disabled={!datetime}
                                >
                                    复制
                                </Button>
                            }
                        />
                    </div>
                </Space>
            </Card>

            {/* 日期转时间戳 */}
            <Card title="日期时间 → 时间戳">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>输入日期时间</Title>
                        <Input
                            value={datetime}
                            onChange={(e) => setDatetime(e.target.value)}
                            placeholder="请输入日期时间，格式：YYYY-MM-DD HH:mm:ss"
                            addonAfter={
                                <Button 
                                    type="link" 
                                    icon={<CalendarOutlined />}
                                    onClick={useCurrentDateTime}
                                >
                                    使用当前
                                </Button>
                            }
                        />
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            支持格式：YYYY-MM-DD HH:mm:ss、YYYY/MM/DD HH:mm:ss、MM/DD/YYYY HH:mm:ss 等
                        </div>
                    </div>

                    <Space>
                        <Button type="primary" onClick={handleDateToTimestamp}>
                            转换为时间戳
                        </Button>
                        <Button onClick={handleClear}>
                            清空
                        </Button>
                    </Space>

                    <div>
                        <Title level={4}>转换结果</Title>
                        <Input
                            value={timestamp}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
                            placeholder="转换后的时间戳将显示在这里..."
                            addonAfter={
                                <Button 
                                    type="link" 
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopy(timestamp)}
                                    disabled={!timestamp}
                                >
                                    复制
                                </Button>
                            }
                        />
                    </div>
                </Space>
            </Card>
        </div>
    );
}
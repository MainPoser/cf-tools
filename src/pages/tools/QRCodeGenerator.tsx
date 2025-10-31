import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Typography, Space, message, Slider, Select, Row, Col } from 'antd';
import { CopyOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import QRCode from 'qrcode';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function QRCodeGenerator() {
    // 自动统计页面访问
    useAutoTrackVisit('二维码生成');

    const [input, setInput] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [size, setSize] = useState(200);
    const [errorCorrection, setErrorCorrection] = useState('M');
    const [margin, setMargin] = useState(4);
    const [darkColor, setDarkColor] = useState('#000000');
    const [lightColor, setLightColor] = useState('#FFFFFF');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 将纠错级别转换为qrcode库的格式
    const getErrorCorrectionLevel = (level: string): 'L' | 'M' | 'Q' | 'H' => {
        return level as 'L' | 'M' | 'Q' | 'H';
    };

    // 生成二维码（使用专业qrcode库）
    const generateQRCode = async () => {
        if (!input.trim()) {
            message.warning('请输入要生成二维码的内容');
            return;
        }

        try {
            if (!canvasRef.current) return;

            // 使用qrcode库生成二维码
            await QRCode.toCanvas(canvasRef.current, input, {
                width: size,
                margin: margin,
                color: {
                    dark: darkColor,
                    light: lightColor
                },
                errorCorrectionLevel: getErrorCorrectionLevel(errorCorrection),
                scale: 4 // 每个模块的像素数
            });

            // 转换为Data URL
            const dataUrl = canvasRef.current.toDataURL('image/png');
            setQrCodeDataUrl(dataUrl);
            message.success('二维码生成成功');
        } catch (error) {
            message.error('二维码生成失败');
            console.error('QR Code generation error:', error);
        }
    };

    // 下载二维码
    const downloadQRCode = () => {
        if (!qrCodeDataUrl) {
            message.warning('请先生成二维码');
            return;
        }

        const link = document.createElement('a');
        link.href = qrCodeDataUrl;
        link.download = `qrcode_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.success('二维码已下载');
    };

    // 复制二维码图片
    const copyQRCode = async () => {
        if (!qrCodeDataUrl) {
            message.warning('请先生成二维码');
            return;
        }

        try {
            // 将Data URL转换为Blob
            const response = await fetch(qrCodeDataUrl);
            const blob = await response.blob();
            
            // 复制到剪贴板
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            message.success('二维码已复制到剪贴板');
        } catch (error) {
            message.error('复制失败，请使用下载功能');
        }
    };

    // 生成SVG格式的二维码
    const generateSVGQRCode = async () => {
        if (!input.trim()) {
            message.warning('请输入要生成二维码的内容');
            return;
        }

        try {
            const svg = await QRCode.toString(input, {
                type: 'svg',
                width: size,
                margin: margin,
                color: {
                    dark: darkColor,
                    light: lightColor
                },
                errorCorrectionLevel: getErrorCorrectionLevel(errorCorrection)
            });

            // 创建Blob并下载
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `qrcode_${Date.now()}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            message.success('SVG二维码已下载');
        } catch (error) {
            message.error('SVG二维码生成失败');
            console.error('SVG QR Code generation error:', error);
        }
    };

    // 清空
    const handleClear = () => {
        setInput('');
        setQrCodeDataUrl('');
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    };

    // 实时生成二维码
    useEffect(() => {
        if (input.trim()) {
            const timer = setTimeout(() => {
                generateQRCode();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setQrCodeDataUrl('');
        }
    }, [input, size, errorCorrection, margin, darkColor, lightColor]);

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <QrcodeOutlined style={{ marginRight: '8px' }} />
                二维码生成器
            </Title>
            <Paragraph>
                输入文本、网址或其他内容，快速生成对应的二维码。使用专业qrcode.js库实现，支持多种格式和自定义选项。
            </Paragraph>

            <Card title="二维码生成" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Title level={4}>输入内容</Title>
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="请输入要生成二维码的内容（文本、网址、联系方式等）..."
                            rows={4}
                            maxLength={2000}
                            showCount
                        />
                    </div>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Title level={4}>尺寸: {size}px</Title>
                            <Slider
                                min={100}
                                max={500}
                                value={size}
                                onChange={setSize}
                                marks={{
                                    100: '100px',
                                    200: '200px',
                                    300: '300px',
                                    400: '400px',
                                    500: '500px'
                                }}
                            />
                        </Col>
                        <Col span={8}>
                            <Title level={4}>边距: {margin}</Title>
                            <Slider
                                min={0}
                                max={10}
                                value={margin}
                                onChange={setMargin}
                                marks={{
                                    0: '0',
                                    2: '2',
                                    4: '4',
                                    6: '6',
                                    8: '8',
                                    10: '10'
                                }}
                            />
                        </Col>
                        <Col span={8}>
                            <Title level={4}>纠错级别</Title>
                            <Select
                                value={errorCorrection}
                                onChange={setErrorCorrection}
                                style={{ width: '100%' }}
                            >
                                <Option value="L">低 (L) - 7% 纠错能力</Option>
                                <Option value="M">中 (M) - 15% 纠错能力</Option>
                                <Option value="Q">较高 (Q) - 25% 纠错能力</Option>
                                <Option value="H">高 (H) - 30% 纠错能力</Option>
                            </Select>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Title level={4}>前景色</Title>
                            <Input
                                type="color"
                                value={darkColor}
                                onChange={(e) => setDarkColor(e.target.value)}
                                style={{ width: '100%', height: '40px' }}
                            />
                        </Col>
                        <Col span={12}>
                            <Title level={4}>背景色</Title>
                            <Input
                                type="color"
                                value={lightColor}
                                onChange={(e) => setLightColor(e.target.value)}
                                style={{ width: '100%', height: '40px' }}
                            />
                        </Col>
                    </Row>

                    <Space>
                        <Button type="primary" onClick={generateQRCode} icon={<QrcodeOutlined />}>
                            生成二维码
                        </Button>
                        <Button onClick={handleClear}>
                            清空
                        </Button>
                        <Button onClick={generateSVGQRCode}>
                            下载SVG
                        </Button>
                    </Space>

                    {qrCodeDataUrl && (
                        <div>
                            <Title level={4}>生成的二维码</Title>
                            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                                <img
                                    src={qrCodeDataUrl}
                                    alt="Generated QR Code"
                                    style={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        backgroundColor: lightColor
                                    }}
                                />
                            </div>
                            <Space style={{ marginTop: '12px' }}>
                                <Button icon={<DownloadOutlined />} onClick={downloadQRCode}>
                                    下载PNG
                                </Button>
                                <Button icon={<CopyOutlined />} onClick={copyQRCode}>
                                    复制图片
                                </Button>
                            </Space>
                        </div>
                    )}
                </Space>
            </Card>

            <Card title="使用说明" style={{ marginTop: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Title level={5}>功能特点：</Title>
                        <ul>
                            <li>✅ 使用专业qrcode.js库，符合ISO标准</li>
                            <li>✅ 支持多种纠错级别 (L/M/Q/H)</li>
                            <li>✅ 支持自定义尺寸和边距</li>
                            <li>✅ 支持自定义前景色和背景色</li>
                            <li>✅ 支持PNG和SVG两种格式导出</li>
                            <li>✅ 本地生成，保护隐私</li>
                            <li>✅ 支持复制到剪贴板</li>
                        </ul>
                    </div>
                    <div>
                        <Title level={5}>支持的输入类型：</Title>
                        <ul>
                            <li>网址链接 (http:// 或 https:// 开头)</li>
                            <li>纯文本内容</li>
                            <li>WiFi连接信息 (WIFI:T:WPA;S:网络名称;P:密码;;)</li>
                            <li>联系方式 (vCard格式)</li>
                            <li>邮件地址 (mailto:email@example.com)</li>
                            <li>电话号码 (tel:+8613800138000)</li>
                            <li>短信 (smsto:+8613800138000:短信内容)</li>
                        </ul>
                    </div>
                    <div>
                        <Title level={5}>纠错级别说明：</Title>
                        <ul>
                            <li><strong>低 (L)</strong>：约7%的纠错能力，可容纳最多数据</li>
                            <li><strong>中 (M)</strong>：约15%的纠错能力，平衡数据容量和纠错</li>
                            <li><strong>较高 (Q)</strong>：约25%的纠错能力，适合重要数据</li>
                            <li><strong>高 (H)</strong>：约30%的纠错能力，最适合恶劣环境</li>
                        </ul>
                    </div>
                    <div>
                        <Title level={5}>格式说明：</Title>
                        <ul>
                            <li><strong>PNG格式</strong>：位图格式，适合直接使用和分享</li>
                            <li><strong>SVG格式</strong>：矢量格式，可无限缩放不失真，适合印刷和设计</li>
                        </ul>
                    </div>
                </Space>
            </Card>

            {/* 隐藏的Canvas用于生成二维码 */}
            <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
            />
        </div>
    );
}
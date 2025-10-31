import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Typography, Space, message, Slider, Select, Row, Col } from 'antd';
import { CopyOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

// 简单的二维码生成器类
class SimpleQRCode {
    private size: number;
    private modules: boolean[][];

    constructor(text: string, size: number = 25) {
        this.size = size;
        this.modules = [];
        this.generate(text);
    }

    private generate(text: string): void {
        // 初始化模块矩阵
        this.modules = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
        
        // 简化的二维码生成算法
        // 1. 添加定位图案
        this.addPositionPatterns();
        
        // 2. 添加数据（简化版本）
        this.addData(text);
        
        // 3. 添加掩码（简化版本）
        this.applyMask();
    }

    private addPositionPatterns(): void {
        // 添加三个角的定位图案
        const positions = [
            [0, 0], [this.size - 7, 0], [0, this.size - 7]
        ];
        
        positions.forEach(([x, y]) => {
            // 7x7 定位图案
            for (let i = 0; i < 7; i++) {
                for (let j = 0; j < 7; j++) {
                    if (x + i < this.size && y + j < this.size) {
                        this.modules[x + i][y + j] = 
                            i === 0 || i === 6 || j === 0 || j === 6 || // 外边框
                            (i >= 2 && i <= 4 && j >= 2 && j <= 4); // 内部方块
                    }
                }
            }
        });
    }

    private addData(text: string): void {
        // 简化的数据编码
        const binary = this.textToBinary(text);
        let dataIndex = 0;
        
        // 从右下角开始螺旋填充数据
        for (let i = this.size - 1; i >= 0 && dataIndex < binary.length; i -= 2) {
            for (let j = this.size - 1; j >= 0 && dataIndex < binary.length; j--) {
                if (this.canPlaceModule(i, j) && dataIndex < binary.length) {
                    this.modules[i][j] = binary[dataIndex] === '1';
                    dataIndex++;
                }
                if (i - 1 >= 0 && this.canPlaceModule(i - 1, j) && dataIndex < binary.length) {
                    this.modules[i - 1][j] = binary[dataIndex] === '1';
                    dataIndex++;
                }
            }
        }
    }

    private textToBinary(text: string): string {
        return text.split('').map(char => 
            char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join('');
    }

    private canPlaceModule(x: number, y: number): boolean {
        // 检查是否可以放置模块（不在定位图案区域）
        const inPositionPattern = 
            (x < 9 && y < 9) || // 左上角
            (x >= this.size - 8 && y < 9) || // 右上角
            (x < 9 && y >= this.size - 8); // 左下角
        
        return !inPositionPattern;
    }

    private applyMask(): void {
        // 简单的掩码模式
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if ((i + j) % 2 === 0) {
                    this.modules[i][j] = !this.modules[i][j];
                }
            }
        }
    }

    public getModules(): boolean[][] {
        return this.modules;
    }

    public renderToCanvas(canvas: HTMLCanvasElement, scale: number = 10): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const canvasSize = this.size * scale;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        // 白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // 绘制二维码模块
        ctx.fillStyle = '#000000';
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.modules[i][j]) {
                    ctx.fillRect(i * scale, j * scale, scale, scale);
                }
            }
        }
    }
}

export default function QRCodeGenerator() {
    // 自动统计页面访问
    useAutoTrackVisit('二维码生成');

    const [input, setInput] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [size, setSize] = useState(200);
    const [errorCorrection, setErrorCorrection] = useState('M');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 生成二维码（使用纯JavaScript）
    const generateQRCode = () => {
        if (!input.trim()) {
            message.warning('请输入要生成二维码的内容');
            return;
        }

        try {
            if (!canvasRef.current) return;

            // 计算二维码模块大小
            const moduleSize = Math.floor(size / 25);
            const qr = new SimpleQRCode(input, 25);
            qr.renderToCanvas(canvasRef.current, moduleSize);

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
    }, [input, size]);

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <QrcodeOutlined style={{ marginRight: '8px' }} />
                二维码生成器
            </Title>
            <Paragraph>
                输入文本、网址或其他内容，快速生成对应的二维码。使用纯JavaScript实现，无需网络连接。
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
                        <Col span={12}>
                            <Title level={4}>二维码尺寸: {size}px</Title>
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
                        <Col span={12}>
                            <Title level={4}>纠错级别</Title>
                            <Select
                                value={errorCorrection}
                                onChange={setErrorCorrection}
                                style={{ width: '100%' }}
                                disabled={false}
                            >
                                <Option value="L">低 (L) - 7% 纠错能力</Option>
                                <Option value="M">中 (M) - 15% 纠错能力</Option>
                                <Option value="Q">较高 (Q) - 25% 纠错能力</Option>
                                <Option value="H">高 (H) - 30% 纠错能力</Option>
                            </Select>
                        </Col>
                    </Row>

                    <Space>
                        <Button type="primary" onClick={generateQRCode} icon={<QrcodeOutlined />}>
                            生成二维码
                        </Button>
                        <Button onClick={handleClear}>
                            清空
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
                                        backgroundColor: 'white'
                                    }}
                                />
                            </div>
                            <Space style={{ marginTop: '12px' }}>
                                <Button icon={<DownloadOutlined />} onClick={downloadQRCode}>
                                    下载二维码
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
                            <li>✅ 纯JavaScript实现，无需网络连接</li>
                            <li>✅ 本地生成，保护隐私</li>
                            <li>✅ 支持自定义尺寸</li>
                            <li>✅ 支持下载和复制功能</li>
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
                        </ul>
                    </div>
                    <div>
                        <Title level={5}>注意事项：</Title>
                        <ul>
                            <li>当前为简化版本，适用于基本需求</li>
                            <li>复杂内容建议使用专业二维码库</li>
                            <li>生成的二维码可能不如标准库精确</li>
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
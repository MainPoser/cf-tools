import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, message, Row, Col, Slider, Tag } from 'antd';
import { CopyOutlined, AlertOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { useAutoTrackVisit } from '../../hooks/useAnalytics';

const { Title, Paragraph } = Typography;

// 颜色格式类型
interface ColorFormats {
    hex: string;
    rgb: string;
    rgba: string;
    hsl: string;
    hsv: string;
    cmyk: string;
}

// 预设颜色
const presetColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788', '#E76F51', '#F72585', '#7209B7',
    '#3A0CA3', '#4361EE', '#4CC9F0', '#06FFA5', '#FFBE0B'
];

// 颜色转换工具函数
class ColorConverter {
    // HEX 转 RGB
    static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // RGB 转 HEX
    static rgbToHex(r: number, g: number, b: number): string {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // RGB 转 HSL
    static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    // HSL 转 RGB
    static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    // RGB 转 HSV
    static rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max !== min) {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
    }

    // RGB 转 CMYK
    static rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
        let c = 1 - (r / 255);
        let m = 1 - (g / 255);
        let y = 1 - (b / 255);
        let k = Math.min(c, m, y);

        if (k === 1) {
            return { c: 0, m: 0, y: 0, k: 100 };
        }

        c = ((c - k) / (1 - k)) * 100;
        m = ((m - k) / (1 - k)) * 100;
        y = ((y - k) / (1 - k)) * 100;
        k = k * 100;

        return {
            c: Math.round(c),
            m: Math.round(m),
            y: Math.round(y),
            k: Math.round(k)
        };
    }

    // 获取所有颜色格式
    static getAllFormats(hex: string): ColorFormats | null {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return null;

        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
        const cmyk = this.rgbToCmyk(rgb.r, rgb.g, rgb.b);

        return {
            hex: hex.toUpperCase(),
            rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
            hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
            cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`
        };
    }
}

export default function ColorPicker() {
    // 自动统计页面访问
    useAutoTrackVisit('颜色选择器');

    const [currentColor, setCurrentColor] = useState('#4ECDC4');
    const [colorFormats, setColorFormats] = useState<ColorFormats | null>(null);
    const [savedColors, setSavedColors] = useState<string[]>([]);
    const [alpha, setAlpha] = useState(100);
    const [hslValues, setHslValues] = useState({ h: 177, s: 59, l: 55 });

    // 初始化颜色格式
    useEffect(() => {
        updateColorFormats(currentColor);
        // 从localStorage加载保存的颜色
        const saved = localStorage.getItem('savedColors');
        if (saved) {
            setSavedColors(JSON.parse(saved));
        }
    }, []);

    // 更新颜色格式
    const updateColorFormats = (color: string) => {
        const formats = ColorConverter.getAllFormats(color);
        setColorFormats(formats);
        
        if (formats) {
            const rgb = ColorConverter.hexToRgb(color);
            if (rgb) {
                const hsl = ColorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);
                setHslValues(hsl);
            }
        }
    };

    // 处理颜色输入
    const handleColorInput = (value: string) => {
        if (/^#?[0-9A-Fa-f]{6}$/.test(value)) {
            const hex = value.startsWith('#') ? value : `#${value}`;
            setCurrentColor(hex.toUpperCase());
            updateColorFormats(hex.toUpperCase());
        } else if (/^rgb\(\d+,\s*\d+,\s*\d+\)$/.test(value)) {
            const matches = value.match(/\d+/g);
            if (matches && matches.length === 3) {
                const hex = ColorConverter.rgbToHex(
                    parseInt(matches[0]),
                    parseInt(matches[1]),
                    parseInt(matches[2])
                );
                setCurrentColor(hex);
                updateColorFormats(hex);
            }
        } else if (/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/.test(value)) {
            const matches = value.match(/\d+/g);
            if (matches && matches.length === 3) {
                const rgb = ColorConverter.hslToRgb(
                    parseInt(matches[0]),
                    parseInt(matches[1]),
                    parseInt(matches[2])
                );
                const hex = ColorConverter.rgbToHex(rgb.r, rgb.g, rgb.b);
                setCurrentColor(hex);
                updateColorFormats(hex);
            }
        }
    };

    // 复制到剪贴板
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    // 保存颜色
    const handleSaveColor = () => {
        if (!savedColors.includes(currentColor)) {
            const newSavedColors = [...savedColors, currentColor];
            setSavedColors(newSavedColors);
            localStorage.setItem('savedColors', JSON.stringify(newSavedColors));
            message.success('颜色已保存');
        } else {
            message.info('颜色已存在');
        }
    };

    // 删除保存的颜色
    const handleDeleteSavedColor = (color: string) => {
        const newSavedColors = savedColors.filter(c => c !== color);
        setSavedColors(newSavedColors);
        localStorage.setItem('savedColors', JSON.stringify(newSavedColors));
        message.success('颜色已删除');
    };

    // 处理HSL滑块变化
    const handleHslChange = (type: 'h' | 's' | 'l', value: number) => {
        const newHsl = { ...hslValues, [type]: value };
        setHslValues(newHsl);
        const rgb = ColorConverter.hslToRgb(newHsl.h, newHsl.s, newHsl.l);
        const hex = ColorConverter.rgbToHex(rgb.r, rgb.g, rgb.b);
        setCurrentColor(hex);
        updateColorFormats(hex);
    };

    // 处理透明度变化
    const handleAlphaChange = (value: number) => {
        setAlpha(value);
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>颜色选择器</Title>
            <Paragraph>
                专业的颜色选择工具，支持多种颜色格式转换、颜色选择和颜色管理
            </Paragraph>

            <Row gutter={[16, 16]}>
                {/* 主颜色选择器 */}
                <Col xs={24} lg={12}>
                    <Card title="颜色选择" extra={
                        <Button 
                            type="primary" 
                            icon={<FormatPainterOutlined />} 
                            onClick={handleSaveColor}
                        >
                            保存颜色
                        </Button>
                    }>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            {/* 颜色预览 */}
                            <div>
                                <Title level={4}>颜色预览</Title>
                                <div 
                                    style={{
                                        width: '100%',
                                        height: '120px',
                                        backgroundColor: currentColor,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {currentColor}
                                </div>
                            </div>

                            {/* 颜色输入 */}
                            <div>
                                <Title level={4}>颜色输入</Title>
                                <Input
                                    value={currentColor}
                                    onChange={(e) => handleColorInput(e.target.value)}
                                    placeholder="输入HEX、RGB或HSL颜色值"
                                    prefix={<AlertOutlined />}
                                    style={{ marginBottom: '8px' }}
                                />
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => {
                                        setCurrentColor(e.target.value);
                                        updateColorFormats(e.target.value);
                                    }}
                                    style={{ 
                                        width: '100%', 
                                        height: '40px', 
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>

                            {/* HSL滑块 */}
                            <div>
                                <Title level={4}>HSL 调节</Title>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>色相 (H)</span>
                                            <span>{hslValues.h}°</span>
                                        </div>
                                        <Slider
                                            min={0}
                                            max={360}
                                            value={hslValues.h}
                                            onChange={(value) => handleHslChange('h', value)}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>饱和度 (S)</span>
                                            <span>{hslValues.s}%</span>
                                        </div>
                                        <Slider
                                            min={0}
                                            max={100}
                                            value={hslValues.s}
                                            onChange={(value) => handleHslChange('s', value)}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>亮度 (L)</span>
                                            <span>{hslValues.l}%</span>
                                        </div>
                                        <Slider
                                            min={0}
                                            max={100}
                                            value={hslValues.l}
                                            onChange={(value) => handleHslChange('l', value)}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>透明度 (A)</span>
                                            <span>{alpha}%</span>
                                        </div>
                                        <Slider
                                            min={0}
                                            max={100}
                                            value={alpha}
                                            onChange={handleAlphaChange}
                                        />
                                    </div>
                                </Space>
                            </div>
                        </Space>
                    </Card>
                </Col>

                {/* 颜色格式显示 */}
                <Col xs={24} lg={12}>
                    <Card title="颜色格式">
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            {colorFormats && Object.entries(colorFormats).map(([format, value]) => (
                                <div key={format}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <Tag color="blue">{format.toUpperCase()}</Tag>
                                        <Button
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => handleCopy(value)}
                                        >
                                            复制
                                        </Button>
                                    </div>
                                    <Input
                                        value={format === 'rgba' ? value.replace('1)', `${(alpha/100).toFixed(2)})`) : value}
                                        readOnly
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            ))}
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* 预设颜色 */}
            <Card title="预设颜色" style={{ marginTop: '16px' }}>
                <Row gutter={[8, 8]}>
                    {presetColors.map((color) => (
                        <Col key={color}>
                            <div
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    backgroundColor: color,
                                    border: '2px solid #fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => {
                                    setCurrentColor(color);
                                    updateColorFormats(color);
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title={color}
                            />
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* 保存的颜色 */}
            {savedColors.length > 0 && (
                <Card 
                    title="保存的颜色" 
                    style={{ marginTop: '16px' }}
                    extra={
                        <Button 
                            size="small" 
                            onClick={() => {
                                setSavedColors([]);
                                localStorage.removeItem('savedColors');
                                message.success('已清空所有保存的颜色');
                            }}
                        >
                            清空
                        </Button>
                    }
                >
                    <Row gutter={[8, 8]}>
                        {savedColors.map((color) => (
                            <Col key={color}>
                                <div
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        backgroundColor: color,
                                        border: '2px solid #fff',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                        position: 'relative'
                                    }}
                                    onClick={() => {
                                        setCurrentColor(color);
                                        updateColorFormats(color);
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title={color}
                                >
                                    <Button
                                        size="small"
                                        danger
                                        style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSavedColor(color);
                                        }}
                                    >
                                        ×
                                    </Button>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}
        </div>
    );
}
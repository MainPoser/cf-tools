import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as fabric from "fabric";
import './SharedCanvasPage.css';

// 画布工具配置接口
interface DrawingConfig {
    color: string;
    width: number;
}

function SharedCanvasPage() {
    // url参数
    const { roomId } = useParams();

    // ref管理
    const canvasEl = useRef<HTMLCanvasElement | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const lastJson = useRef<any>(null); // 缓存上一次 JSON

    // canvas配置
    const [drawingBrushConfig, setDrawingConfig] = useState<DrawingConfig>({
        color: "#000000",
        width: 3
    });

    // 动态尺寸设置逻辑 (保持不变，但现在它会基于 Flex 自动计算出的 clientWidth/clientHeight)
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        const container = canvasContainerRef.current;

        if (!canvas || !container) return;

        const resizeCanvas = () => {
            const { clientWidth, clientHeight } = container;
            const ratio = window.devicePixelRatio || 1;

            // 设置 canvas 元素的实际分辨率
            canvas.setDimensions({
                width: clientWidth,
                height: clientHeight
            })

            // 同步内部像素分辨率，避免模糊或错位
            const ctx = canvas.getContext();
            if (ctx) {
                const el = canvas.getElement();
                el.width = clientWidth * ratio;
                el.height = clientHeight * ratio;
                ctx.scale(ratio, ratio);
            }

            canvas.calcOffset();
            canvas.requestRenderAll();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    useEffect(() => {
        if (!canvasEl.current || !roomId) return;

        // 初始化 Fabric Canvas
        const febricCanvas = new fabric.Canvas(canvasEl.current, {
            backgroundColor: "#ffffff",
            selection: false,
        });
        febricCanvas.isDrawingMode = true;
        febricCanvas.freeDrawingBrush = new fabric.PencilBrush(febricCanvas);
        febricCanvas.freeDrawingBrush.color = drawingBrushConfig.color;
        febricCanvas.freeDrawingBrush.width = drawingBrushConfig.width;
        febricCanvas.requestRenderAll();

        fabricCanvasRef.current = febricCanvas;

        // 远程更新处理
        const handleRemoteUpdate = (jsonData: any) => {
            // 避免重复渲染
            if (JSON.stringify(jsonData) !== JSON.stringify(lastJson.current)) {
                lastJson.current = jsonData;
                febricCanvas.loadFromJSON(jsonData, () => {
                    febricCanvas.calcOffset();
                    febricCanvas.requestRenderAll();
                });
            }
        };

        // 连接 WebSocket
        let WS_BASE = import.meta.env.MODE === "development"
            ? "ws://localhost:8787"
            : ""; // 替换为生产域名
        const ws = new WebSocket(`${WS_BASE}/api/canvas/${roomId}`);
        wsRef.current = ws;

        ws.onmessage = (evt) => {
            try {
                const data = JSON.parse(evt.data);
                if (data.type === "update" && data.payload) {
                    handleRemoteUpdate(data.payload);
                }
            } catch { }
        };

        // 本地绘制 -> 发送 WebSocket
        febricCanvas.on("path:created", () => {
            const json = febricCanvas.toJSON();
            lastJson.current = json;
            ws.send(JSON.stringify({ type: "update", payload: json }));
        });

        return () => {
            ws.close();
            febricCanvas.dispose();
        };
    }, [roomId]);

    // 动态更新画笔
    useEffect(() => {
        if (fabricCanvasRef.current?.freeDrawingBrush) {
            fabricCanvasRef.current.freeDrawingBrush.color = drawingBrushConfig.color;
            fabricCanvasRef.current.freeDrawingBrush.width = drawingBrushConfig.width;
        }
    }, [drawingBrushConfig.color, drawingBrushConfig.width]);

    // 清空画布
    const clearCanvas = () => {
        if (!fabricCanvasRef.current) return;

        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.backgroundColor = "#ffffff";
        fabricCanvasRef.current.requestRenderAll();

        const json = fabricCanvasRef.current.toJSON();
        lastJson.current = json;
        wsRef.current?.send(JSON.stringify({ type: "update", payload: json }));
    };

    return (
        <div className="canvas-page-container">
            <div className="canvas-toolbar">
                <h2 className="canvas-title">共享画布房间：{roomId}</h2>
                <label>
                    颜色：
                    <input type="color" value={drawingBrushConfig.color} onChange={(e) => setDrawingConfig({ ...drawingBrushConfig, color: e.target.value })} />
                </label>
                <label>
                    粗细：
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={drawingBrushConfig.width}
                        onChange={(e) => setDrawingConfig({ ...drawingBrushConfig, width: Number(e.target.value) })}
                    />
                </label>
                <button
                    onClick={clearCanvas}
                    className="clear-button"
                >
                    清空画布
                </button>
            </div>
            {/* 画布区域容器：使用 CanvasContainerStyle (Flex 核心部分) */}
            <div ref={canvasContainerRef} className="canvas-container">
                <canvas
                    ref={canvasEl}
                    className="canvas-element"
                />
            </div>

            <p className="canvas-hint">
                按下鼠标并拖动即可绘制
            </p>
        </div>
    );
};

export default SharedCanvasPage;
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as fabric from "fabric";

// =======================================================
// CSS 样式定义 (重点使用 Flex 属性)
// =======================================================

// 1. 外部容器样式 (垂直 Flex 布局，保证画布自动填充)
const PageContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column', // 垂直布局
    alignItems: 'center',
    padding: '20px',
    // 关键：让容器占据所有可用高度
    minHeight: 'calc(100vh - 120px)', // 假设减去 MainLayout Header/Footer 高度
    backgroundColor: '#f5f5f5', // 柔和的背景色
};

// 2. 工具栏样式 (固定高度)
const ToolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    padding: '12px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    zIndex: 10, // 确保工具栏在最上层
};

// 3. 画布容器样式 (自动填充剩余空间 + 视觉区分)
const CanvasContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1200px',
    flexGrow: 1, // 核心属性：让容器占据所有剩余的垂直空间
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    margin: '0 auto', // 居中
    position: 'relative', // 确保 canvas 元素能基于此容器定位
};

// 4. 画布元素样式 (确保填满父容器)
const CanvasElementStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
};

function SharedCanvasPage() {
    const { roomId } = useParams();
    const canvasEl = useRef<HTMLCanvasElement | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const lastJson = useRef<any>(null); // 缓存上一次 JSON
    const [color, setColor] = useState("#000000");
    const [width, setWidth] = useState(3);

    // 动态尺寸设置逻辑 (保持不变，但现在它会基于 Flex 自动计算出的 clientWidth/clientHeight)
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvasContainerRef.current;

        if (!canvas || !container) return;

        const resizeCanvas = () => {
            const { clientWidth, clientHeight } = container;
            canvas.setWidth(clientWidth);
            canvas.setHeight(clientHeight);
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
        const canvas = new fabric.Canvas(canvasEl.current, {
            backgroundColor: "#ffffff",
            selection: false,
        });
        canvasRef.current = canvas;

        // 初始化画笔
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = width;
        canvas.requestRenderAll();

        // WebSocket 地址，根据环境切换
        let WS_BASE = import.meta.env.MODE === "development"
            ? "ws://localhost:8787"
            : ""; // 替换为生产域名

        // 连接 WebSocket
        const ws = new WebSocket(`${WS_BASE}/api/canvas/${roomId}`);
        wsRef.current = ws;

        // 远程更新处理
        const handleRemoteUpdate = (jsonData: any) => {
            // 避免重复渲染
            if (JSON.stringify(jsonData) !== JSON.stringify(lastJson.current)) {
                lastJson.current = jsonData;
                canvas.loadFromJSON(jsonData, () => {
                    canvas.calcOffset();
                    canvas.requestRenderAll();
                });
            }
        };

        ws.onmessage = (evt) => {
            try {
                const data = JSON.parse(evt.data);
                if (data.type === "update" && data.payload) {
                    handleRemoteUpdate(data.payload);
                }
            } catch { }
        };

        // 本地绘制 -> 发送 WebSocket
        canvas.on("path:created", () => {
            const json = canvas.toJSON();
            lastJson.current = json;
            ws.send(JSON.stringify({ type: "update", payload: json }));
        });

        return () => {
            ws.close();
            canvas.dispose();
        };
    }, [roomId]);

    // 动态更新画笔
    useEffect(() => {
        if (canvasRef.current?.freeDrawingBrush) {
            canvasRef.current.freeDrawingBrush.color = color;
            canvasRef.current.freeDrawingBrush.width = width;
        }
    }, [color, width]);

    // 清空画布
    const clearCanvas = () => {
        if (!canvasRef.current) return;

        canvasRef.current.clear();
        canvasRef.current.backgroundColor = "#ffffff";
        canvasRef.current.requestRenderAll();

        const json = canvasRef.current.toJSON();
        lastJson.current = json;
        wsRef.current?.send(JSON.stringify({ type: "update", payload: json }));
    };

    return (
        <div style={PageContainerStyle}>
            <div style={ToolbarStyle}>
                <h2 className="text-xl font-semibold mb-4">共享画布房间：{roomId}</h2>
                <label>
                    颜色：
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                </label>
                <label>
                    粗细：
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                    />
                </label>
                <button
                    onClick={clearCanvas}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                >
                    清空画布
                </button>
            </div>
            {/* 画布区域容器：使用 CanvasContainerStyle (Flex 核心部分) */}
            <div ref={canvasContainerRef} style={CanvasContainerStyle}>
                <canvas
                    ref={canvasEl}
                    style={CanvasElementStyle}
                />
            </div>


            <p style={{ marginTop: '16px', color: '#718096', fontSize: '0.875rem' }}>
                按下鼠标并拖动即可绘制
            </p>
        </div>
    );
};

export default SharedCanvasPage;

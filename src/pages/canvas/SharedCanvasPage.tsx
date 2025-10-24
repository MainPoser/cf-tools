import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as fabric from "fabric";

const SharedCanvasPage: React.FC = () => {
    const { roomId } = useParams();
    const canvasEl = useRef<HTMLCanvasElement | null>(null);
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const lastJson = useRef<any>(null); // 缓存上一次 JSON
    const [color, setColor] = useState("#000000");
    const [width, setWidth] = useState(3);

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
        <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-gray-100">
            <h2 className="text-xl font-semibold mb-4">共享画布房间：{roomId}</h2>

            <div className="flex gap-2 mb-4">
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

            <canvas
                ref={canvasEl}
                width={800}
                height={600}
                className="border border-gray-400 rounded shadow bg-white"
            />

            <p className="mt-2 text-gray-500 text-sm">
                按下鼠标并拖动即可绘制
            </p>
        </div>
    );
};

export default SharedCanvasPage;

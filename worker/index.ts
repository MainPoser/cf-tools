import { CanvasRoom } from './CanvasRoom';

export { CanvasRoom }

export interface Env {
  CANVAS_ROOM: DurableObjectNamespace;
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);

    // 所有后端接口以 /api 开头
    if (url.pathname.startsWith("/api/canvas/")) {
      // 获取房间名
      const parts = url.pathname.split("/"); // ["", "api", "canvas", "roomId"]
      const roomName = parts[3];
      if (!roomName) return new Response("Room not specified", { status: 400 });
      console.log(roomName);
      const id = env.CANVAS_ROOM.idFromName(roomName);
      const obj = env.CANVAS_ROOM.get(id);
      return obj.fetch(request);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "大业有成",
      });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
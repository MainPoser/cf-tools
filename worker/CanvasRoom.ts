import { DurableObject } from "cloudflare:workers";

export class CanvasRoom extends DurableObject {
  state: DurableObjectState;
  clients: Set<WebSocket>;

  constructor(state: DurableObjectState,env: Env) {
    super(state,env);
    this.state = state;
    this.clients = new Set();
  }

  async fetch(req: Request) {
    console.log(req)
    const upgrade = req.headers.get("Upgrade");
    if (upgrade !== "websocket") return new Response("Expected websocket", { status: 426 });

    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    server.accept();
    this.handleSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  handleSocket(ws: WebSocket) {
    this.clients.add(ws);

    ws.addEventListener("message", evt => {
      for (const client of this.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(evt.data);
        }
      }
    });

    ws.addEventListener("close", () => {
      this.clients.delete(ws);
    });
  }
}

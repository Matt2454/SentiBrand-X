import { fetchRealtimeSnapshot } from "../../../../lib/realtimeSnapshot";
import type { HeartbeatData, ErrorData, DashboardError } from "../../../../types/dashboard";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function toSseEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function createHeartbeatData(): HeartbeatData {
  return {
    status: "alive",
    timestamp: new Date().toISOString(),
  };
}

function createErrorData(error: DashboardError): ErrorData {
  return {
    code: error.code,
    message: error.message,
    timestamp: error.timestamp,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand") ?? undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastPayload = "";
      let heartbeatCounter = 0;

      const pushSnapshot = async () => {
        if (closed) {
          return;
        }

        try {
          const snapshot = await fetchRealtimeSnapshot(brand);
          const payload = JSON.stringify(snapshot);

          if (payload !== lastPayload) {
            lastPayload = payload;
            controller.enqueue(toSseEvent("snapshot", snapshot));
            console.log(`Snapshot sent for brand: ${brand || 'all'}`);
          }
        } catch (error) {
          console.error("Error fetching snapshot:", error);
          const errorData: DashboardError = {
            code: "SNAPSHOT_ERROR",
            message: "Failed to fetch realtime snapshot",
            details: error,
            timestamp: new Date().toISOString(),
            recoverable: true,
          };
          controller.enqueue(toSseEvent("error", createErrorData(errorData)));
        }
      };

      const pushHeartbeat = () => {
        if (closed) {
          return;
        }

        try {
          const heartbeat = createHeartbeatData();
          controller.enqueue(toSseEvent("heartbeat", heartbeat));
          heartbeatCounter++;
          console.log(`Heartbeat sent: ${heartbeatCounter}`);
        } catch (error) {
          console.error("Error sending heartbeat:", error);
        }
      };

      // Initial snapshot
      await pushSnapshot();

      // Heartbeat interval - every 15 seconds
      const heartbeatInterval = setInterval(() => {
        pushHeartbeat();
      }, 15000);

      // Snapshot polling interval - every 2 seconds
      const snapshotInterval = setInterval(() => {
        void pushSnapshot();
      }, 2000);

      // Cleanup on connection close
      const cleanup = () => {
        closed = true;
        clearInterval(heartbeatInterval);
        clearInterval(snapshotInterval);
        console.log("SSE connection closed");
        
        try {
          controller.close();
        } catch (error) {
          console.error("Error closing controller:", error);
        }
      };

      request.signal.addEventListener("abort", cleanup);

      // Handle connection timeout (5 minutes max)
      const timeoutId = setTimeout(() => {
        if (!closed) {
          console.log("Connection timeout, closing...");
          cleanup();
        }
      }, 5 * 60 * 1000);

      request.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
      });

      // Send initial heartbeat after 1 second
      setTimeout(() => {
        if (!closed) {
          pushHeartbeat();
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

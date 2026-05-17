import { fetchRealtimeSnapshot } from "../../../../lib/realtimeSnapshot";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function toSseEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand") ?? undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastPayload = "";

      const pushSnapshot = async () => {
        if (closed) {
          return;
        }

        const snapshot = await fetchRealtimeSnapshot(brand);
        const payload = JSON.stringify(snapshot);

        if (payload !== lastPayload) {
          lastPayload = payload;
          controller.enqueue(toSseEvent("snapshot", snapshot));
        }
      };

      await pushSnapshot();

      const interval = setInterval(() => {
        void pushSnapshot();
      }, 2000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

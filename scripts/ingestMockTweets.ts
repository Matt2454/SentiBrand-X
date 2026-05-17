import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MockIngestionEvent, MockTweet } from "../lib/mock";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const mockDataPath = path.resolve(__dirname, "../data/mockData.json");
  const raw = await readFile(mockDataPath, "utf8");
  const tweets = JSON.parse(raw) as MockTweet[];
  const delay = Number(process.env.MOCK_INGESTION_DELAY_MS ?? 150);

  process.stdout.write(
    `Starting X mock ingestion with ${tweets.length} records...\n`,
  );

  for (const tweet of tweets) {
    const event: MockIngestionEvent = {
      event: "ingested",
      at: new Date().toISOString(),
      payload: tweet,
    };

    process.stdout.write(`${JSON.stringify(event)}\n`);
    await wait(delay);
  }

  process.stdout.write("Mock ingestion finished.\n");
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Mock ingestion failed: ${message}\n`);
  process.exit(1);
});

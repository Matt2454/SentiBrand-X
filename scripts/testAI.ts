import { analyzeSentiment } from "../lib/sentimentService";

async function run() {
  const sample =
    "I love the new product update, but the latest login flow is still a bit slow.";

  const result = await analyzeSentiment(sample);
  process.stdout.write(`${JSON.stringify({ sample, result }, null, 2)}\n`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`AI test failed: ${message}\n`);
  process.exit(1);
});

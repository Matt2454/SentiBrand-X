import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { convertXquikRecords, readXquikJsonPayload } from "../lib/xquikImport";

async function run(): Promise<void> {
  const [inputPath, outputPath = "data/mockData.json", brand = "ImportedBrand"] =
    process.argv.slice(2);

  if (!inputPath) {
    process.stderr.write(
      "Usage: npm run convert:xquik -- <xquik-export.json|jsonl> [output-json] [brand]\n",
    );
    process.exit(1);
  }

  const sourcePath = path.resolve(inputPath);
  const destinationPath = path.resolve(outputPath);
  const raw = await readFile(sourcePath, "utf8");
  const records = sourcePath.endsWith(".jsonl")
    ? raw
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .flatMap((line) => readXquikJsonPayload(JSON.parse(line)))
    : readXquikJsonPayload(JSON.parse(raw));

  const tweets = convertXquikRecords(records, { brand });
  await writeFile(destinationPath, `${JSON.stringify(tweets, null, 2)}\n`);
  process.stdout.write(`Wrote ${tweets.length} mock tweets to ${destinationPath}\n`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Xquik conversion failed: ${message}\n`);
  process.exit(1);
});

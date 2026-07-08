import { describe, expect, it } from "vitest";
import { convertXquikRecords, readXquikJsonPayload } from "../lib/xquikImport";

describe("convertXquikRecords", () => {
  it("maps Xquik tweet fields into mock ingestion records", () => {
    const tweets = convertXquikRecords(
      [
        {
          id: "1900000000000000001",
          createdAt: "2026-07-08T12:00:00.000Z",
          author: { username: "brandwatcher" },
          text: "AcmeCloud latency is down this week",
          lang: "en",
        },
      ],
      { brand: "AcmeCloud" },
    );

    expect(tweets).toEqual([
      {
        id: "1900000000000000001",
        brand: "AcmeCloud",
        author: "@brandwatcher",
        text: "AcmeCloud latency is down this week",
        createdAt: "2026-07-08T12:00:00.000Z",
        lang: "en",
        source: "x",
      },
    ]);
  });

  it("skips records without tweet text", () => {
    const tweets = convertXquikRecords([{ id: "empty" }], { brand: "AcmeCloud" });

    expect(tweets).toEqual([]);
  });
});

describe("readXquikJsonPayload", () => {
  it("reads wrapped tweet arrays", () => {
    const records = readXquikJsonPayload({
      tweets: [{ id: "1", text: "Wrapped record" }],
    });

    expect(records).toEqual([{ id: "1", text: "Wrapped record" }]);
  });
});

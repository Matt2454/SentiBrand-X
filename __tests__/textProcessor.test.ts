import { describe, expect, it } from "vitest";
import { cleanTweetText } from "../lib/textProcessor";

describe("cleanTweetText", () => {
  it("removes URLs, mentions, and hashtags", () => {
    const input =
      "Huge thanks @sentibrand team! Read https://example.com/report #AI #BrandMonitoring";

    const output = cleanTweetText(input);

    expect(output).toBe("Huge thanks team! Read");
  });

  it("keeps regular text intact and trims extra spaces", () => {
    const input = "  Product launch was smooth and stable   ";

    const output = cleanTweetText(input);

    expect(output).toBe("Product launch was smooth and stable");
  });
});

export type MockTweet = {
  id: string;
  brand: string;
  author: string;
  text: string;
  createdAt: string;
  lang: string;
  source: "x";
};

export type MockIngestionEvent = {
  event: "ingested";
  at: string;
  payload: MockTweet;
};

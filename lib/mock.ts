export type MockTweet = {
  id: string;
  brand: string;
  author: string;
  authorHandle: string;
  authorFollowers: number;
  text: string;
  createdAt: string;
  lang: string;
  source: "x";
  likes: number;
  retweets: number;
  replies: number;
};

export type MockIngestionEvent = {
  event: "ingested";
  at: string;
  payload: MockTweet;
};

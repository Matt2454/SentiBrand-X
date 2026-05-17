"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimeSnapshot } from "../lib/realtimeSnapshot";

const EMPTY_SNAPSHOT: RealtimeSnapshot = {
  totalMentions: 0,
  totalAnalyzed: 0,
  averageSentiment: "N/A",
  sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
  recentTweets: [],
  lastUpdate: null,
};

export function useMentionsEvents(brand?: string) {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot>(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting",
  );

  const query = useMemo(() => {
    if (!brand || brand.trim().length === 0) {
      return "";
    }
    return `?brand=${encodeURIComponent(brand)}`;
  }, [brand]);

  useEffect(() => {
    const source = new EventSource(`/api/events/mentions${query}`);

    source.onopen = () => setStatus("connected");
    source.onerror = () => setStatus("error");
    source.addEventListener("snapshot", (event) => {
      const parsed = JSON.parse(event.data) as RealtimeSnapshot;
      setSnapshot(parsed);
    });

    return () => {
      source.close();
    };
  }, [query]);

  return { snapshot, status };
}

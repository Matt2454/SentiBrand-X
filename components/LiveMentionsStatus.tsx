"use client";

import { Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useMentionsEvents } from "../hooks/useMentionsEvents";

type LiveMentionsStatusProps = {
  brand?: string;
};

export function LiveMentionsStatus({ brand }: LiveMentionsStatusProps) {
  const { snapshot, status } = useMentionsEvents(brand);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      <div className="flex items-center gap-2">
        <motion.div
          animate={status === "connected" ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Activity
            className={`h-3.5 w-3.5 ${
              status === "connected"
                ? "text-emerald-500"
                : status === "error"
                  ? "text-rose-500"
                  : "text-amber-500"
            }`}
          />
        </motion.div>
        <span className="font-medium">
          Live {status === "connected" ? "Connected" : status}
        </span>
      </div>
      <p className="mt-1">
        Mentions: {snapshot.totalMentions} · Analyzed: {snapshot.totalAnalyzed}
      </p>
    </div>
  );
}

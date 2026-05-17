"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type RecentTweet = {
  id: string;
  brand: string;
  author_handle: string;
  raw_text: string;
  posted_at: string;
};

type AnimatedTweetProps = {
  tweet: RecentTweet;
  index: number;
};

const tweetVariants = {
  hidden: { 
    opacity: 0, 
    y: -20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1
  },
  exit: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  }
};

export function AnimatedTweet({ tweet, index }: AnimatedTweetProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.li
      key={tweet.id}
      variants={tweetVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.4, ease: "easeOut" }}
      layout
      className="space-y-2 px-5 py-4 border-zinc-200 dark:border-zinc-700"
      whileHover={{ 
        backgroundColor: isHovered ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.01)",
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        originY: index === 0 ? 0 : 0.5
      }}
    >
      <motion.div 
        className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
        layout="position"
      >
        <motion.span 
          className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-1 font-medium text-zinc-700 dark:text-zinc-300"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          {tweet.brand}
        </motion.span>
        <motion.span
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          {tweet.author_handle}
        </motion.span>
        <motion.span>•</motion.span>
        <motion.span
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.15 }}
        >
          {new Date(tweet.posted_at).toLocaleString()}
        </motion.span>
      </motion.div>
      <motion.p 
        className="text-sm leading-6 text-zinc-800 dark:text-zinc-200"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.2, duration: 0.3 }}
      >
        {tweet.raw_text}
      </motion.p>
    </motion.li>
  );
}

type AnimatedTweetListProps = {
  tweets: RecentTweet[];
};

export function AnimatedTweetList({ tweets }: AnimatedTweetListProps) {
  return (
    <AnimatePresence mode="popLayout">
      {tweets.map((tweet, index) => (
        <AnimatedTweet 
          key={tweet.id} 
          tweet={tweet} 
          index={index}
        />
      ))}
    </AnimatePresence>
  );
}

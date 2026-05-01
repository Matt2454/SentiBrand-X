"use client";

import { motion } from "framer-motion";
import { 
  MessageSquareText, 
  TrendingUp, 
  Database, 
  Zap,
  ArrowRight,
  BarChart3
} from "lucide-react";
import type { EmptyStateConfig } from "../types/dashboard";

interface EmptyStateProps {
  type: "no-data" | "no-connection" | "no-results" | "welcome";
  config?: Partial<EmptyStateConfig>;
  onAction?: () => void;
}

const emptyStateConfigs: Record<EmptyStateProps["type"], EmptyStateConfig> = {
  welcome: {
    title: "Welcome to SentiBrand-X",
    description: "Your intelligent brand sentiment analysis command center. Start by ingesting some data to see real-time insights.",
    actionText: "Get Started",
    actionHref: "#get-started",
    illustration: "welcome",
  },
  "no-data": {
    title: "No data available",
    description: "Configure your database connection and ingest some brand mentions to start analyzing sentiment.",
    actionText: "Configure Database",
    actionHref: "#configure",
    illustration: "no-data",
  },
  "no-connection": {
    title: "Connection lost",
    description: "Unable to connect to the database. Please check your configuration and try again.",
    actionText: "Retry Connection",
    actionHref: "#retry",
    illustration: "no-connection",
  },
  "no-results": {
    title: "No mentions found",
    description: "No brand mentions match your current filters. Try adjusting your search criteria or ingest more data.",
    actionText: "Clear Filters",
    actionHref: "#clear",
    illustration: "no-results",
  },
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
  },
};

const iconVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
  },
};

function getIllustration(type: EmptyStateProps["type"]) {
  switch (type) {
    case "welcome":
      return (
        <div className="relative">
          <motion.div
            variants={iconVariants}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-20 blur-xl" />
          </motion.div>
          <motion.div variants={iconVariants} transition={{ duration: 0.6, ease: "easeOut" }} className="relative">
            <BarChart3 className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
        </div>
      );
      
    case "no-data":
      return (
        <div className="relative">
          <motion.div
            variants={iconVariants}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-20 blur-xl" />
          </motion.div>
          <motion.div variants={iconVariants} transition={{ duration: 0.6, ease: "easeOut" }} className="relative">
            <Database className="h-16 w-16 text-amber-600 dark:text-amber-400" />
          </motion.div>
        </div>
      );
      
    case "no-connection":
      return (
        <div className="relative">
          <motion.div
            variants={iconVariants}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 opacity-20 blur-xl" />
          </motion.div>
          <motion.div variants={iconVariants} transition={{ duration: 0.6, ease: "easeOut" }} className="relative">
            <Zap className="h-16 w-16 text-rose-600 dark:text-rose-400" />
          </motion.div>
        </div>
      );
      
    case "no-results":
      return (
        <div className="relative">
          <motion.div
            variants={iconVariants}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 opacity-20 blur-xl" />
          </motion.div>
          <motion.div variants={iconVariants} transition={{ duration: 0.6, ease: "easeOut" }} className="relative">
            <MessageSquareText className="h-16 w-16 text-blue-600 dark:text-blue-400" />
          </motion.div>
        </div>
      );
      
    default:
      return null;
  }
}

function getQuickActions(type: EmptyStateProps["type"]) {
  switch (type) {
    case "welcome":
      return [
        { icon: Database, label: "Configure Database", href: "#configure" },
        { icon: MessageSquareText, label: "Ingest Mock Data", href: "#ingest" },
        { icon: TrendingUp, label: "View Analytics", href: "#analytics" },
      ];
      
    case "no-data":
      return [
        { icon: Database, label: "Set up Supabase", href: "#supabase" },
        { icon: MessageSquareText, label: "Import Tweets", href: "#import" },
      ];
      
    case "no-connection":
      return [
        { icon: Zap, label: "Test Connection", href: "#test" },
        { icon: Database, label: "Check Config", href: "#config" },
      ];
      
    case "no-results":
      return [
        { icon: MessageSquareText, label: "Clear Filters", href: "#clear" },
        { icon: TrendingUp, label: "Browse All", href: "#all" },
      ];
      
    default:
      return [];
  }
}

export function EmptyState({ type, config, onAction }: EmptyStateProps) {
  const finalConfig = { ...emptyStateConfigs[type], ...config };
  const illustration = getIllustration(type);
  const quickActions = getQuickActions(type);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.1 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <motion.div variants={itemVariants} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-6">
        {illustration}
      </motion.div>

      <motion.div variants={itemVariants} transition={{ duration: 0.5, ease: "easeOut" }} className="max-w-md">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          {finalConfig.title}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
          {finalConfig.description}
        </p>
      </motion.div>

      {quickActions.length > 0 && (
        <motion.div 
          variants={itemVariants}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (onAction && index === 0) {
                  onAction();
                }
                // Handle navigation or action here
                console.log(`Action clicked: ${action.label}`);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          ))}
        </motion.div>
      )}

      {finalConfig.actionText && (
        <motion.div variants={itemVariants} transition={{ duration: 0.5, ease: "easeOut" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAction}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-600 dark:hover:to-emerald-700"
          >
            {finalConfig.actionText}
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}

      {/* Decorative elements */}
      <motion.div
        variants={itemVariants}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-12 flex gap-8 text-zinc-400 dark:text-zinc-600"
      >
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Real-time Analysis</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span>AI-Powered</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span>Enterprise Ready</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Specialized empty states for specific use cases
export function DashboardWelcomeEmptyState() {
  return (
    <EmptyState
      type="welcome"
      onAction={() => {
        // Navigate to configuration or start onboarding
        console.log("Starting onboarding...");
      }}
    />
  );
}

export function NoDataEmptyState() {
  return (
    <EmptyState
      type="no-data"
      onAction={() => {
        // Open configuration modal or navigate to settings
        console.log("Opening configuration...");
      }}
    />
  );
}

export function NoResultsEmptyState() {
  return (
    <EmptyState
      type="no-results"
      onAction={() => {
        // Clear filters or reset search
        console.log("Clearing filters...");
      }}
    />
  );
}

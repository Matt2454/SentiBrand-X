#!/usr/bin/env tsx

import { watch } from "fs";
import { resolve, join, extname } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { WatchConfig, WatchEvent } from "../types/dashboard";

const execAsync = promisify(exec);

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Default configuration for watching mentions
const DEFAULT_WATCH_CONFIG: WatchConfig = {
  watchPaths: [
    resolve(process.cwd(), "data"),
    resolve(process.cwd(), "mock-data"),
    resolve(process.cwd(), "tweets"),
  ],
  filePattern: "*.json",
  debounceMs: 1000,
  autoAnalyze: true,
};

class MentionWatcher {
  private config: WatchConfig;
  private isProcessing = false;
  private watchers: Array<{ path: string; watcher: ReturnType<typeof watch> }> = [];
  private processedFiles = new Set<string>();

  constructor(config: Partial<WatchConfig> = {}) {
    this.config = { ...DEFAULT_WATCH_CONFIG, ...config };
  }

  private log(message: string, type: "info" | "success" | "warning" | "error" = "info") {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [WATCH]`;
    
    switch (type) {
      case "success":
        console.log(`\x1b[32m${prefix} ✅ ${message}\x1b[0m`);
        break;
      case "warning":
        console.log(`\x1b[33m${prefix} ⚠️  ${message}\x1b[0m`);
        break;
      case "error":
        console.log(`\x1b[31m${prefix} ❌ ${message}\x1b[0m`);
        break;
      default:
        console.log(`${prefix} ℹ️  ${message}`);
    }
  }

  private shouldProcessFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const isJsonFile = ext === ".json";
    const matchesPattern = filePath.includes("tweets") || filePath.includes("mentions");
    const notRecentlyProcessed = !this.processedFiles.has(filePath);
    
    return isJsonFile && matchesPattern && notRecentlyProcessed;
  }

  private async processFile(filePath: string): Promise<void> {
    if (this.isProcessing) {
      this.log(`Already processing, skipping ${filePath}`, "warning");
      return;
    }

    if (!this.shouldProcessFile(filePath)) {
      return;
    }

    this.isProcessing = true;
    this.processedFiles.add(filePath);

    try {
      this.log(`Processing file: ${filePath}`, "info");
      
      if (this.config.autoAnalyze) {
        this.log("Running analysis and ingestion...", "info");
        try {
          await execAsync("npm run process:mentions");
          this.log("Analysis and ingestion completed", "success");
        } catch (error) {
          this.log(`Analysis failed: ${error}`, "error");
          throw error;
        }
      }

      // Clean up old processed files periodically
      if (this.processedFiles.size > 100) {
        const filesToKeep = Array.from(this.processedFiles).slice(-50);
        this.processedFiles = new Set(filesToKeep);
      }

    } catch (error) {
      this.log(`Error processing file ${filePath}: ${error}`, "error");
    } finally {
      this.isProcessing = false;
    }
  }

  private createEventHandler = (watchPath: string) => {
    return debounce(async (eventType: string, filename: string | null) => {
      if (!filename) {
        return;
      }

      const filePath = join(watchPath, filename);
      const event: WatchEvent = {
        type: eventType as WatchEvent["type"],
        path: filePath,
        timestamp: new Date().toISOString(),
      };

      this.log(`File event: ${eventType} - ${filePath}`, "info");

      if (eventType === "add" || eventType === "change") {
        await this.processFile(filePath);
      } else if (eventType === "unlink") {
        this.processedFiles.delete(filePath);
        this.log(`Removed from processing queue: ${filePath}`, "info");
      }
    }, this.config.debounceMs);
  };

  public async start(): Promise<void> {
    this.log("Starting mention watcher...", "info");
    this.log(`Watch paths: ${this.config.watchPaths.join(", ")}`, "info");
    this.log(`File pattern: ${this.config.filePattern}`, "info");
    this.log(`Debounce: ${this.config.debounceMs}ms`, "info");
    this.log(`Auto analyze: ${this.config.autoAnalyze}`, "info");

    // Create watchers for each path
    for (const watchPath of this.config.watchPaths) {
      try {
        const handler = this.createEventHandler(watchPath);
        const watcher = watch(watchPath, { recursive: true }, handler);
        
        this.watchers.push({
          path: watchPath,
          watcher,
        });

        this.log(`Watching: ${watchPath}`, "success");
      } catch (error) {
        this.log(`Failed to watch ${watchPath}: ${error}`, "error");
      }
    }

    if (this.watchers.length === 0) {
      this.log("No valid paths to watch. Exiting.", "error");
      process.exit(1);
    }

    this.log(`Watching ${this.watchers.length} directories. Press Ctrl+C to stop.`, "success");

    // Handle graceful shutdown
    const shutdown = () => {
      this.log("Shutting down watchers...", "info");
      
      for (const { watcher, path } of this.watchers) {
        try {
          watcher.close();
          this.log(`Stopped watching: ${path}`, "info");
        } catch (error) {
          this.log(`Error stopping watcher for ${path}: ${error}`, "error");
        }
      }
      
      this.log("Watcher stopped.", "success");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("SIGUSR2", shutdown); // nodemon restart
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<WatchConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case "--paths":
        const paths = args[++i]?.split(",");
        if (paths) {
          config.watchPaths = paths.map(p => resolve(process.cwd(), p.trim()));
        }
        break;
        
      case "--pattern":
        config.filePattern = args[++i];
        break;
        
      case "--debounce":
        config.debounceMs = parseInt(args[++i]) || 1000;
        break;
        
      case "--no-auto-analyze":
        config.autoAnalyze = false;
        break;
        
      case "--help":
      case "-h":
        console.log(`
SentiBrand-X Mention Watcher

Usage: npm run watch-mentions [options]

Options:
  --paths <paths>        Comma-separated list of paths to watch (default: data,mock-data,tweets)
  --pattern <pattern>    File pattern to match (default: *.json)
  --debounce <ms>        Debounce delay in milliseconds (default: 1000)
  --no-auto-analyze      Disable automatic analysis
  --help, -h             Show this help message

Examples:
  npm run watch-mentions
  npm run watch-mentions --paths "data,custom-tweets"
  npm run watch-mentions --debounce 2000 --no-auto-analyze
        `);
        process.exit(0);
        
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown option: ${arg}`);
          console.error("Use --help for available options");
          process.exit(1);
        }
    }
  }

  const watcher = new MentionWatcher(config);
  await watcher.start();
}

// Error handling
process.on("uncaughtException", (error) => {
  console.error(`\x1b[31m[WATCH] ❌ Uncaught exception: ${error}\x1b[0m`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(`\x1b[31m[WATCH] ❌ Unhandled rejection at: ${promise}, reason: ${reason}\x1b[0m`);
  process.exit(1);
});

// Run the watcher
if (require.main === module) {
  main().catch((error) => {
    console.error(`\x1b[31m[WATCH] ❌ Failed to start watcher: ${error}\x1b[0m`);
    process.exit(1);
  });
}

export { MentionWatcher };

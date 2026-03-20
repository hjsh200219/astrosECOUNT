type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const VALID_LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const rawLogLevel = process.env.LOG_LEVEL;
const currentLevel: LogLevel =
  rawLogLevel && (VALID_LOG_LEVELS as string[]).includes(rawLogLevel)
    ? (rawLogLevel as LogLevel)
    : "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) process.stderr.write(formatMessage("debug", message, meta) + "\n");
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) process.stderr.write(formatMessage("info", message, meta) + "\n");
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) process.stderr.write(formatMessage("warn", message, meta) + "\n");
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) process.stderr.write(formatMessage("error", message, meta) + "\n");
  },
};

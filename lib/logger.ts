/* eslint-disable no-console */

/**
 * Single shared structured logger for the whole application.
 *
 * All application logging goes through this module. Transports are pluggable:
 * additional sinks (Sentry, OpenTelemetry, log drains, etc.) can be attached
 * with `logger.addTransport(...)` during app startup without changing any
 * application code that calls `logger.*`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
}

export interface LogTransport {
  write(entry: LogEntry): void;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function serializeContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, serializeValue(value)]),
  );
}

/**
 * Default sink. Emits single-line JSON (structured, parseable by log
 * platforms) regardless of environment; suppressed entirely during tests.
 */
export const consoleTransport: LogTransport = {
  write(entry) {
    const line = JSON.stringify(entry);
    switch (entry.level) {
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      default:
        console.info(line);
    }
  },
};

class Logger {
  private readonly transports: LogTransport[];

  constructor(transports: LogTransport[] = [consoleTransport]) {
    this.transports = transports;
  }

  /** Attach an additional sink (Sentry, OpenTelemetry, ...) at startup. */
  addTransport(transport: LogTransport) {
    this.transports.push(transport);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.write('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    const entry: LogEntry = {
      level,
      message,
      context: serializeContext(context),
      timestamp: new Date().toISOString(),
    };
    for (const transport of this.transports) {
      transport.write(entry);
    }
  }
}

export const logger = new Logger();

type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const payload = context ? ` ${JSON.stringify(context)}` : '';
    return `[${level.toUpperCase()}] ${message}${payload}`;
  }

  info(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(this.formatMessage('error', message, context));
    }
  }
}

export const logger = new Logger();

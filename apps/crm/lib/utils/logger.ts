/**
 * Centralized logging utility
 * Provides structured logging with context (user ID, request ID, timestamp)
 * Supports different log levels: DEBUG, INFO, WARN, ERROR
 * Integrated with Sentry for error tracking in production
 */

import * as Sentry from '@sentry/nextjs'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  userId?: string
  requestId?: string
  component?: string
  action?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Logger metadata can have any additional properties
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  error?: Error
}

export class Logger {
  private minLevel: LogLevel
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    // In production, only show WARN and ERROR
    // In development, show all levels
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): string {
    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]

    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    const errorStr = error
      ? ` | Error: ${error.message}${error.stack ? `\n${error.stack}` : ''}`
      : ''

    return `[${timestamp}] [${levelName}] ${message}${contextStr}${errorStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.minLevel) return

    const formatted = this.formatMessage(level, message, context, error)
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    }

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formatted)
        break
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
        console.error(formatted)
        break
    }

    // Send to Sentry in production
    if (!this.isDevelopment && level >= LogLevel.ERROR) {
      this.sendToErrorTracking(entry)
    }
  }

  private sendToErrorTracking(entry: LogEntry): void {
    try {
      if (entry.error) {
        Sentry.captureException(entry.error, {
          level: entry.level === LogLevel.ERROR ? 'error' : 'warning',
          tags: {
            component: entry.context?.component,
            action: entry.context?.action,
          },
          extra: entry.context,
          user: entry.context?.userId ? { id: entry.context.userId } : undefined,
        })
      } else {
        Sentry.captureMessage(entry.message, {
          level: entry.level === LogLevel.ERROR ? 'error' : 'warning',
          tags: {
            component: entry.context?.component,
            action: entry.context?.action,
          },
          extra: entry.context,
          user: entry.context?.userId ? { id: entry.context.userId } : undefined,
        })
      }
    } catch (err) {
      // Fallback to console if Sentry fails
      console.error('Failed to send error to Sentry:', err)
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error)
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  // Convenience method for API routes
  api(route: string, method: string, context?: LogContext) {
    return {
      start: () => {
        this.info(`[API] ${method} ${route} started`, { ...context, route, method })
        return Date.now()
      },
      end: (startTime: number, statusCode?: number) => {
        const duration = Date.now() - startTime
        const level = statusCode && statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO
        this.log(level, `[API] ${method} ${route} completed`, {
          ...context,
          route,
          method,
          statusCode,
          duration: `${duration}ms`,
        })
      },
      error: (err: Error, statusCode?: number) => {
        this.error(
          `[API] ${method} ${route} failed`,
          { ...context, route, method, statusCode },
          err
        )
      },
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context)
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context)
export const logWarn = (message: string, context?: LogContext, error?: Error) =>
  logger.warn(message, context, error)
export const logError = (message: string, context?: LogContext, error?: Error) =>
  logger.error(message, context, error)

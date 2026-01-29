import { logger } from '@/lib/utils/logger'

/**
 * Monitoring & Logging für KI-System
 * Trackt Function Calls, Erfolgsrate, Performance-Metriken
 */

export interface FunctionCallLog {
  functionName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any> // Function call arguments can vary
  result: string | void
  success: boolean
  duration: number
  timestamp: Date
  error?: string
  retryCount?: number
}

export interface WorkflowLog {
  workflowType: string
  success: boolean
  steps: Array<{
    name: string
    success: boolean
    duration: number
  }>
  totalDuration: number
  timestamp: Date
}

class AIMonitoring {
  private functionCallLogs: FunctionCallLog[] = []
  private workflowLogs: WorkflowLog[] = []
  private readonly MAX_LOGS = 1000 // Behalte nur die letzten 1000 Logs

  /**
   * Loggt einen Function Call
   */
  logFunctionCall(log: FunctionCallLog): void {
    this.functionCallLogs.push(log)

    // Behalte nur die letzten MAX_LOGS
    if (this.functionCallLogs.length > this.MAX_LOGS) {
      this.functionCallLogs.shift()
    }

    logger.info('Function Call ausgeführt', {
      component: 'ai-monitoring',
      functionName: log.functionName,
      success: log.success,
      duration: log.duration,
      retryCount: log.retryCount,
    })

    if (!log.success) {
      logger.warn('Function Call fehlgeschlagen', {
        component: 'ai-monitoring',
        functionName: log.functionName,
        error: log.error,
        retryCount: log.retryCount,
      })
    }
  }

  /**
   * Loggt einen Workflow
   */
  logWorkflow(log: WorkflowLog): void {
    this.workflowLogs.push(log)

    // Behalte nur die letzten MAX_LOGS
    if (this.workflowLogs.length > this.MAX_LOGS) {
      this.workflowLogs.shift()
    }

    logger.info('Workflow ausgeführt', {
      component: 'ai-monitoring',
      workflowType: log.workflowType,
      success: log.success,
      totalDuration: log.totalDuration,
      stepsCompleted: log.steps.filter(s => s.success).length,
      stepsTotal: log.steps.length,
    })
  }

  /**
   * Gibt Erfolgsrate für Function Calls zurück
   */
  getFunctionCallSuccessRate(functionName?: string): number {
    const logs = functionName
      ? this.functionCallLogs.filter(l => l.functionName === functionName)
      : this.functionCallLogs

    if (logs.length === 0) return 0

    const successful = logs.filter(l => l.success).length
    return (successful / logs.length) * 100
  }

  /**
   * Gibt durchschnittliche Ausführungszeit zurück
   */
  getAverageDuration(functionName?: string): number {
    const logs = functionName
      ? this.functionCallLogs.filter(l => l.functionName === functionName)
      : this.functionCallLogs

    if (logs.length === 0) return 0

    const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0)
    return totalDuration / logs.length
  }

  /**
   * Gibt häufigste Fehler zurück
   */
  getMostCommonErrors(limit: number = 10): Array<{ error: string; count: number }> {
    const errorCounts: Record<string, number> = {}

    this.functionCallLogs
      .filter(l => !l.success && l.error)
      .forEach(l => {
        errorCounts[l.error!] = (errorCounts[l.error!] || 0) + 1
      })

    return Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Gibt Statistiken zurück
   */
  getStatistics(): {
    totalFunctionCalls: number
    successRate: number
    averageDuration: number
    mostCommonErrors: Array<{ error: string; count: number }>
    functionCallBreakdown: Array<{
      functionName: string
      count: number
      successRate: number
      averageDuration: number
    }>
    workflowStats: {
      total: number
      successRate: number
      averageDuration: number
    }
  } {
    const functionCallBreakdown = Array.from(
      new Set(this.functionCallLogs.map(l => l.functionName))
    ).map(functionName => ({
      functionName,
      count: this.functionCallLogs.filter(l => l.functionName === functionName).length,
      successRate: this.getFunctionCallSuccessRate(functionName),
      averageDuration: this.getAverageDuration(functionName),
    }))

    const workflowSuccessRate =
      this.workflowLogs.length > 0
        ? (this.workflowLogs.filter(l => l.success).length / this.workflowLogs.length) * 100
        : 0

    const workflowAverageDuration =
      this.workflowLogs.length > 0
        ? this.workflowLogs.reduce((sum, l) => sum + l.totalDuration, 0) / this.workflowLogs.length
        : 0

    return {
      totalFunctionCalls: this.functionCallLogs.length,
      successRate: this.getFunctionCallSuccessRate(),
      averageDuration: this.getAverageDuration(),
      mostCommonErrors: this.getMostCommonErrors(),
      functionCallBreakdown,
      workflowStats: {
        total: this.workflowLogs.length,
        successRate: workflowSuccessRate,
        averageDuration: workflowAverageDuration,
      },
    }
  }

  /**
   * Prüft ob Alarme ausgelöst werden sollten
   */
  checkAlarms(): Array<{ type: string; message: string; severity: 'warning' | 'error' }> {
    const alarms: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = []

    // Alarm: Erfolgsrate unter 80%
    const successRate = this.getFunctionCallSuccessRate()
    if (successRate < 80 && this.functionCallLogs.length > 10) {
      alarms.push({
        type: 'low_success_rate',
        message: `Niedrige Erfolgsrate: ${successRate.toFixed(1)}%`,
        severity: 'warning',
      })
    }

    // Alarm: Viele Fehler bei bestimmter Funktion
    const functionCallBreakdown = Array.from(
      new Set(this.functionCallLogs.map(l => l.functionName))
    ).map(functionName => ({
      functionName,
      successRate: this.getFunctionCallSuccessRate(functionName),
      count: this.functionCallLogs.filter(l => l.functionName === functionName).length,
    }))

    functionCallBreakdown.forEach(fc => {
      if (fc.successRate < 50 && fc.count > 5) {
        alarms.push({
          type: 'function_failing',
          message: `Funktion ${fc.functionName} hat niedrige Erfolgsrate: ${fc.successRate.toFixed(1)}%`,
          severity: 'error',
        })
      }
    })

    return alarms
  }

  /**
   * Löscht alle Logs (für Testing)
   */
  clearLogs(): void {
    this.functionCallLogs = []
    this.workflowLogs = []
  }
}

// Singleton-Instanz
export const aiMonitoring = new AIMonitoring()

/**
 * Helper-Funktion zum Loggen von Function Calls
 */
export function logFunctionCall(
  functionName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>, // Function call arguments can vary
  result: string | void,
  duration: number,
  retryCount?: number
): void {
  const success = result !== undefined && typeof result === 'string' && result.startsWith('✅')
  const error = !success && typeof result === 'string' ? result : undefined

  aiMonitoring.logFunctionCall({
    functionName,
    args,
    result,
    success,
    duration,
    timestamp: new Date(),
    error,
    retryCount,
  })
}

/**
 * Helper-Funktion zum Loggen von Workflows
 */
export function logWorkflow(
  workflowType: string,
  success: boolean,
  steps: Array<{ name: string; success: boolean; duration: number }>,
  totalDuration: number
): void {
  aiMonitoring.logWorkflow({
    workflowType,
    success,
    steps,
    totalDuration,
    timestamp: new Date(),
  })
}

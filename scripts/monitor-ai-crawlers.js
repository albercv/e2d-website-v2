#!/usr/bin/env node

/**
 * Script de monitoreo automático para crawlers IA
 * 
 * Este script puede ejecutarse como cron job para monitoreo continuo:
 * 
 * Cada 30 minutos:
 * 0,30 * * * * /usr/bin/node /path/to/monitor-ai-crawlers.js
 * 
 * Cada hora:
 * 0 * * * * /usr/bin/node /path/to/monitor-ai-crawlers.js
 * 
 * Cada 6 horas:
 * 0 0,6,12,18 * * * /usr/bin/node /path/to/monitor-ai-crawlers.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Configuración
const CONFIG = {
  baseUrl: process.env.SITE_URL || 'https://evolve2digital.com',
  apiEndpoint: '/api/admin/ai-crawler-monitor',
  logFile: path.join(__dirname, '../logs/ai-crawler-monitor.log'),
  webhookUrl: process.env.WEBHOOK_URL, // Opcional: para notificaciones externas
  
  // Configuración de monitoreo
  monitoring: {
    checkInterval: 30, // minutos
    alertThresholds: {
      maxResponseTime: 5000, // ms
      minSuccessRate: 95, // porcentaje
      maxErrorsPerHour: 10,
    },
    testUrls: [
      {
        crawlerType: 'GPTBot',
        urls: [
          'https://evolve2digital.com/es',
          'https://evolve2digital.com/es/blog',
          'https://evolve2digital.com/sitemap.xml',
        ],
      },
      {
        crawlerType: 'Google-Extended',
        urls: [
          'https://evolve2digital.com/es',
          'https://evolve2digital.com/es/blog',
          'https://evolve2digital.com/sitemap.xml',
        ],
      },
      {
        crawlerType: 'ClaudeBot',
        urls: [
          'https://evolve2digital.com/es',
          'https://evolve2digital.com/es/blog',
          'https://evolve2digital.com/sitemap.xml',
        ],
      },
    ],
  }
}

/**
 * Realiza una petición HTTP
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed,
          })
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          })
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

/**
 * Ejecuta el ciclo de monitoreo
 */
async function runMonitoringCycle() {
  try {
    log('INFO', 'Starting AI crawler monitoring cycle...')
    
    const url = `${CONFIG.baseUrl}${CONFIG.apiEndpoint}?action=run-cycle`
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Crawler-Monitor-Script/1.0',
      },
      body: JSON.stringify({
        config: CONFIG.monitoring,
      }),
    }
    
    const response = await makeRequest(url, options)
    
    if (response.statusCode === 200 && response.data.success) {
      const { healthChecks, alerts } = response.data.data
      
      log('INFO', `Monitoring cycle completed successfully`)
      log('INFO', `Health checks performed: ${healthChecks.length}`)
      log('INFO', `Alerts generated: ${alerts.length}`)
      
      // Procesar alertas
      if (alerts.length > 0) {
        log('WARNING', `Generated ${alerts.length} alerts:`)
        alerts.forEach(alert => {
          log(alert.type.toUpperCase(), `${alert.crawlerType}: ${alert.message}`)
        })
        
        // Enviar notificaciones si hay webhook configurado
        if (CONFIG.webhookUrl) {
          await sendWebhookNotification(alerts)
        }
      }
      
      // Log de estadísticas de health checks
      const crawlerStats = {}
      healthChecks.forEach(check => {
        if (!crawlerStats[check.crawlerType]) {
          crawlerStats[check.crawlerType] = { success: 0, failed: 0, totalTime: 0 }
        }
        
        if (check.success) {
          crawlerStats[check.crawlerType].success++
          crawlerStats[check.crawlerType].totalTime += check.responseTime || 0
        } else {
          crawlerStats[check.crawlerType].failed++
        }
      })
      
      Object.entries(crawlerStats).forEach(([crawler, stats]) => {
        const total = stats.success + stats.failed
        const successRate = ((stats.success / total) * 100).toFixed(1)
        const avgTime = stats.success > 0 ? (stats.totalTime / stats.success).toFixed(0) : 0
        
        log('INFO', `${crawler}: ${successRate}% success rate, avg response time: ${avgTime}ms`)
      })
      
    } else {
      log('ERROR', `Monitoring cycle failed: ${response.data.message || 'Unknown error'}`)
      process.exit(1)
    }
    
  } catch (error) {
    log('ERROR', `Error in monitoring cycle: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Obtiene estadísticas del monitoreo
 */
async function getMonitoringStats() {
  try {
    const url = `${CONFIG.baseUrl}${CONFIG.apiEndpoint}?action=stats`
    const response = await makeRequest(url)
    
    if (response.statusCode === 200 && response.data.success) {
      const stats = response.data.data
      
      log('INFO', 'Current monitoring statistics:')
      log('INFO', `Recent alerts: ${stats.recentAlerts.length}`)
      
      Object.entries(stats.healthChecks).forEach(([crawler, checks]) => {
        log('INFO', `${crawler}: ${checks.length} recent health checks`)
      })
      
      // Estadísticas de crawler del logger
      if (stats.crawlerStats) {
        log('INFO', 'Crawler access statistics:')
        Object.entries(stats.crawlerStats).forEach(([crawler, data]) => {
          log('INFO', `${crawler}: ${data.totalRequests} requests, last seen: ${data.lastSeen || 'Never'}`)
        })
      }
      
    } else {
      log('ERROR', `Failed to get monitoring stats: ${response.data.message || 'Unknown error'}`)
    }
    
  } catch (error) {
    log('ERROR', `Error getting monitoring stats: ${error.message}`)
  }
}

/**
 * Envía notificación webhook
 */
async function sendWebhookNotification(alerts) {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      service: 'AI Crawler Monitor',
      hostname: require('os').hostname(),
      alerts: alerts.map(alert => ({
        type: alert.type,
        crawler: alert.crawlerType,
        message: alert.message,
        timestamp: alert.timestamp,
      })),
    }
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
    
    await makeRequest(CONFIG.webhookUrl, options)
    log('INFO', `Sent webhook notification with ${alerts.length} alerts`)
    
  } catch (error) {
    log('ERROR', `Failed to send webhook notification: ${error.message}`)
  }
}

/**
 * Función de logging
 */
function log(level, message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}`
  
  // Imprimir en consola
  console.log(logMessage)
  
  // Escribir en archivo de log
  try {
    // Crear directorio de logs si no existe
    const logDir = path.dirname(CONFIG.logFile)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n')
  } catch (error) {
    console.error('Failed to write to log file:', error.message)
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'monitor'
  
  log('INFO', `Starting AI crawler monitor script with command: ${command}`)
  
  switch (command) {
    case 'monitor':
      await runMonitoringCycle()
      break
      
    case 'stats':
      await getMonitoringStats()
      break
      
    case 'test':
      log('INFO', 'Running test mode...')
      await getMonitoringStats()
      await runMonitoringCycle()
      break
      
    default:
      console.log('Usage: node monitor-ai-crawlers.js [monitor|stats|test]')
      console.log('')
      console.log('Commands:')
      console.log('  monitor  - Run monitoring cycle (default)')
      console.log('  stats    - Get current monitoring statistics')
      console.log('  test     - Run both stats and monitoring cycle')
      process.exit(1)
  }
  
  log('INFO', 'AI crawler monitor script completed successfully')
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  log('ERROR', `Uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `Unhandled rejection at ${promise}: ${reason}`)
  process.exit(1)
})

// Ejecutar función principal
if (require.main === module) {
  main().catch((error) => {
    log('ERROR', `Script failed: ${error.message}`)
    process.exit(1)
  })
}
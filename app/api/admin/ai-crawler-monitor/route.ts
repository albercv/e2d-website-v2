import { NextRequest, NextResponse } from 'next/server'
import { 
  runMonitoringCycle, 
  getCrawlerHealthStats, 
  performHealthCheck,
  defaultMonitoringConfig,
  type MonitoringConfig 
} from '@/lib/ai-crawler-monitor'

// GET /api/admin/ai-crawler-monitor - Obtener estadísticas y estado actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        const stats = await getCrawlerHealthStats()
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        })

      case 'health-check':
        const crawlerType = searchParams.get('crawler') || 'GPTBot'
        const url = searchParams.get('url') || 'https://evolve2digital.com/es'
        
        const healthCheck = await performHealthCheck(crawlerType, url)
        return NextResponse.json({
          success: true,
          data: healthCheck,
          timestamp: new Date().toISOString(),
        })

      case 'config':
        return NextResponse.json({
          success: true,
          data: defaultMonitoringConfig,
          timestamp: new Date().toISOString(),
        })

      default:
        // Por defecto, devolver estadísticas completas
        const fullStats = await getCrawlerHealthStats()
        return NextResponse.json({
          success: true,
          data: fullStats,
          timestamp: new Date().toISOString(),
        })
    }
  } catch (error) {
    console.error('Error in AI crawler monitor API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// POST /api/admin/ai-crawler-monitor - Ejecutar ciclo de monitoreo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const config: MonitoringConfig = {
      ...defaultMonitoringConfig,
      ...body.config,
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'run-cycle':
        const result = await runMonitoringCycle(config)
        return NextResponse.json({
          success: true,
          data: result,
          message: `Monitoring cycle completed. Checked ${result.healthChecks.length} URLs, generated ${result.alerts.length} alerts.`,
          timestamp: new Date().toISOString(),
        })

      case 'test-crawler':
        const { crawlerType, url } = body
        if (!crawlerType || !url) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required parameters',
              message: 'crawlerType and url are required',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }

        const testResult = await performHealthCheck(crawlerType, url)
        return NextResponse.json({
          success: true,
          data: testResult,
          message: `Health check completed for ${crawlerType} on ${url}`,
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            message: 'Supported actions: run-cycle, test-crawler',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in AI crawler monitor POST API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
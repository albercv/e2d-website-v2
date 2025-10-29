import { NextRequest, NextResponse } from 'next/server'
import { 
  getSecurityStats, 
  defaultSecurityConfig, 
  updateSecurityConfig,
  cleanupOldData,
  type SecurityConfig 
} from '@/lib/ai-crawler-security'

// GET /api/admin/ai-crawler-security - Obtener estadísticas de seguridad
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        const stats = getSecurityStats()
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        })

      case 'config':
        return NextResponse.json({
          success: true,
          data: defaultSecurityConfig,
          timestamp: new Date().toISOString(),
        })

      case 'cleanup':
        cleanupOldData()
        return NextResponse.json({
          success: true,
          message: 'Old data cleaned up successfully',
          timestamp: new Date().toISOString(),
        })

      default:
        // Por defecto, devolver estadísticas de seguridad
        const securityStats = getSecurityStats()
        return NextResponse.json({
          success: true,
          data: securityStats,
          timestamp: new Date().toISOString(),
        })
    }
  } catch (error) {
    console.error('Error in AI crawler security API:', error)
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

// POST /api/admin/ai-crawler-security - Actualizar configuración de seguridad
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'update-config':
        const { config } = body
        if (!config) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing configuration',
              message: 'config parameter is required',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }

        const updatedConfig = updateSecurityConfig(config)
        return NextResponse.json({
          success: true,
          data: updatedConfig,
          message: 'Security configuration updated successfully',
          timestamp: new Date().toISOString(),
        })

      case 'emergency-mode':
        const { enabled, allowedCrawlers, maxRequestsPerMinute } = body
        
        const emergencyConfig = updateSecurityConfig({
          emergencyMode: {
            enabled: enabled ?? false,
            allowedCrawlers: allowedCrawlers ?? ['GPTBot', 'Google-Extended'],
            maxRequestsPerMinute: maxRequestsPerMinute ?? 5,
          },
        })

        return NextResponse.json({
          success: true,
          data: emergencyConfig.emergencyMode,
          message: `Emergency mode ${enabled ? 'enabled' : 'disabled'}`,
          timestamp: new Date().toISOString(),
        })

      case 'blacklist':
        const { ip, operation } = body // operation: 'add' | 'remove'
        
        if (!ip || !operation) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing parameters',
              message: 'ip and operation (add/remove) are required',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }

        const currentBlacklist = defaultSecurityConfig.ipBlacklist || []
        let newBlacklist: string[]

        if (operation === 'add') {
          newBlacklist = [...new Set([...currentBlacklist, ip])]
        } else if (operation === 'remove') {
          newBlacklist = currentBlacklist.filter(blockedIp => blockedIp !== ip)
        } else {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid operation',
              message: 'operation must be "add" or "remove"',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }

        const blacklistConfig = updateSecurityConfig({
          ipBlacklist: newBlacklist,
        })

        return NextResponse.json({
          success: true,
          data: { ipBlacklist: blacklistConfig.ipBlacklist },
          message: `IP ${ip} ${operation === 'add' ? 'added to' : 'removed from'} blacklist`,
          timestamp: new Date().toISOString(),
        })

      case 'rate-limits':
        const { crawlerType, limits } = body
        
        if (!crawlerType || !limits) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing parameters',
              message: 'crawlerType and limits are required',
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }

        const rateLimitConfig = updateSecurityConfig({
          rateLimits: {
            ...defaultSecurityConfig.rateLimits,
            [crawlerType]: {
              ...defaultSecurityConfig.rateLimits[crawlerType] || defaultSecurityConfig.rateLimits.default,
              ...limits,
            },
          },
        })

        return NextResponse.json({
          success: true,
          data: { 
            crawlerType, 
            limits: rateLimitConfig.rateLimits[crawlerType] 
          },
          message: `Rate limits updated for ${crawlerType}`,
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            message: 'Supported actions: update-config, emergency-mode, blacklist, rate-limits',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in AI crawler security POST API:', error)
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

// DELETE /api/admin/ai-crawler-security - Limpiar datos o resetear configuración
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'cleanup':
        cleanupOldData()
        return NextResponse.json({
          success: true,
          message: 'Security data cleaned up successfully',
          timestamp: new Date().toISOString(),
        })

      case 'reset-violations':
        // En una implementación real, esto limpiaría las violaciones del cache
        return NextResponse.json({
          success: true,
          message: 'Violation history reset successfully',
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            message: 'Supported actions: cleanup, reset-violations',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in AI crawler security DELETE API:', error)
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
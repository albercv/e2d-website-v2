/**
 * MCP Logs Admin Endpoint
 * 
 * Endpoint administrativo para consultar logs y estadísticas del sistema MCP.
 * Proporciona acceso a métricas de uso, errores y rendimiento.
 * 
 * @route GET /api/mcp/logs
 * @admin true
 * @security basic-auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { mcpLogger } from '@/lib/mcp-logger'
import type { MCPEventType, LogLevel } from '@/lib/mcp-logger'

/**
 * Headers CORS básicos
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

/**
 * Verifica autenticación básica (simple para admin)
 */
function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  // Validar credenciales del entorno antes de procesar el header
  const adminUser = process.env.MCP_ADMIN_USER
  const adminPass = process.env.MCP_ADMIN_PASSWORD
  if (!adminUser || !adminPass) {
    throw new Error('MCP_ADMIN_CREDENTIALS_NOT_CONFIGURED')
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    return username === adminUser && password === adminPass
  } catch {
    return false
  }
}

/**
 * Parsea parámetros de filtro
 */
function parseFilters(searchParams: URLSearchParams) {
  const filters: any = {}
  
  const eventType = searchParams.get('eventType')
  if (eventType) {
    filters.eventType = eventType as MCPEventType
  }
  
  const level = searchParams.get('level')
  if (level) {
    filters.level = level as LogLevel
  }
  
  const tool = searchParams.get('tool')
  if (tool) {
    filters.tool = tool
  }
  
  const success = searchParams.get('success')
  if (success !== null) {
    filters.success = success === 'true'
  }
  
  const startDate = searchParams.get('startDate')
  if (startDate) {
    filters.startDate = new Date(startDate)
  }
  
  const endDate = searchParams.get('endDate')
  if (endDate) {
    filters.endDate = new Date(endDate)
  }
  
  return filters
}

/**
 * Maneja solicitudes OPTIONS para CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

/**
 * Maneja solicitudes GET
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    if (!checkAuth(request)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Basic authentication required'
        },
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'WWW-Authenticate': 'Basic realm="MCP Admin"'
          }
        }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'
    
    switch (action) {
      case 'stats': {
        const stats = mcpLogger.getStats()
        return NextResponse.json({
          action: 'stats',
          timestamp: new Date().toISOString(),
          data: stats
        }, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          }
        })
      }
      
      case 'recent': {
        const limit = parseInt(searchParams.get('limit') || '100')
        const logs = mcpLogger.getRecentLogs(Math.min(limit, 1000)) // Máximo 1000
        
        return NextResponse.json({
          action: 'recent',
          timestamp: new Date().toISOString(),
          limit,
          count: logs.length,
          data: logs
        }, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          }
        })
      }
      
      case 'filtered': {
        const filters = parseFilters(searchParams)
        const logs = mcpLogger.getFilteredLogs(filters)
        
        return NextResponse.json({
          action: 'filtered',
          timestamp: new Date().toISOString(),
          filters,
          count: logs.length,
          data: logs
        }, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          }
        })
      }
      
      case 'export': {
        const filters = parseFilters(searchParams)
        const exportData = mcpLogger.exportLogs(Object.keys(filters).length > 0 ? filters : undefined)
        
        return new NextResponse(exportData, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="mcp-logs-${new Date().toISOString().split('T')[0]}.json"`
          }
        })
      }
      
      case 'health': {
        const stats = mcpLogger.getStats()
        const recentErrors = mcpLogger.getFilteredLogs({
          level: 'error',
          startDate: new Date(Date.now() - 60 * 60 * 1000) // Última hora
        })
        
        const health = {
          status: recentErrors.length > 10 ? 'unhealthy' : 'healthy',
          totalRequests: stats.totalRequests,
          successRate: stats.totalRequests > 0 
            ? Math.round((stats.successfulRequests / stats.totalRequests) * 100) 
            : 100,
          averageProcessingTime: Math.round(stats.averageProcessingTime),
          recentErrors: recentErrors.length,
          performanceMetrics: stats.performanceMetrics,
          timestamp: new Date().toISOString()
        }
        
        return NextResponse.json({
          action: 'health',
          data: health
        }, {
          status: health.status === 'healthy' ? 200 : 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          }
        })
      }
      
      default: {
        return NextResponse.json(
          {
            error: 'Invalid action',
            message: 'Supported actions: stats, recent, filtered, export, health',
            availableActions: ['stats', 'recent', 'filtered', 'export', 'health']
          },
          {
            status: 400,
            headers: corsHeaders
          }
        )
      }
    }
    
  } catch (error) {
    console.error('MCP Logs Admin Error:', error)

    if (error instanceof Error && error.message === 'MCP_ADMIN_CREDENTIALS_NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'MCP admin credentials are not configured. Please set MCP_ADMIN_USER and MCP_ADMIN_PASSWORD in your environment.'
        },
        {
          status: 500,
          headers: corsHeaders
        }
      )
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve logs'
      },
      {
        status: 500,
        headers: corsHeaders
      }
    )
  }
}

/**
 * Maneja métodos no permitidos
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests',
      allowedMethods: ['GET', 'OPTIONS']
    },
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Allow': 'GET, OPTIONS',
      }
    }
  )
}

export { POST as PUT, POST as DELETE, POST as PATCH }
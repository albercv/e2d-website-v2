/**
 * MCP Tool: appointments.create
 * 
 * Herramienta MCP para crear citas o solicitudes de contacto.
 * Permite a los modelos de IA programar reuniones o enviar solicitudes
 * de contacto estructuradas.
 * 
 * @route POST /api/mcp/tools/appointments/create
 * @tool appointments.create
 * @category actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { mcpLogger } from '@/lib/mcp-logger'
import { createRateLimitMiddleware, getRateLimitHeaders } from '@/lib/mcp-rate-limiter'

/**
 * Configuración de la herramienta
 */
const TOOL_CONFIG = {
  name: 'appointments.create',
  version: '1.0.0',
  maxNameLength: 100,
  maxEmailLength: 255,
  maxMessageLength: 2000,
  maxSubjectLength: 200,
  allowedTypes: ['consultation', 'meeting', 'support', 'collaboration', 'other'] as const,
  cacheMaxAge: 0, // No cache para acciones
}

/**
 * Headers CORS para acceso de IA
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, User-Agent, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

/**
 * Headers específicos para MCP
 */
const mcpHeaders = {
  'X-MCP-Tool': TOOL_CONFIG.name,
  'X-MCP-Version': '1.0',
  'X-Content-Type': 'mcp-tool-response',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
}

/**
 * Tipos de cita disponibles
 */
type AppointmentType = typeof TOOL_CONFIG.allowedTypes[number]

/**
 * Estructura de datos de entrada
 */
interface AppointmentRequest {
  name: string
  email: string
  subject: string
  message: string
  type: AppointmentType
  preferredDate?: string
  preferredTime?: string
  timezone?: string
  locale?: string
  phone?: string
  company?: string
  urgency?: 'low' | 'medium' | 'high'
}

/**
 * Estructura de respuesta de la herramienta
 */
interface ToolResponse {
  tool: string
  success: boolean
  appointmentId?: string
  message: string
  processingTime: number
  timestamp: string
  metadata: {
    type: AppointmentType
    locale: string
    version: string
    estimatedResponse: string
  }
  nextSteps?: string[]
}

/**
 * Valida dirección de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida fecha ISO
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && dateString.includes('T')
}

/**
 * Valida zona horaria
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Genera ID único para la cita
 */
function generateAppointmentId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `apt_${timestamp}_${random}`
}

/**
 * Estima tiempo de respuesta basado en urgencia y tipo
 */
function estimateResponseTime(type: AppointmentType, urgency: string = 'medium'): string {
  const baseHours = {
    consultation: 24,
    meeting: 12,
    support: 4,
    collaboration: 48,
    other: 24
  }
  
  const urgencyMultiplier = {
    high: 0.5,
    medium: 1,
    low: 2
  }
  
  const hours = baseHours[type] * urgencyMultiplier[urgency as keyof typeof urgencyMultiplier]
  
  if (hours < 1) return 'En menos de 1 hora'
  if (hours < 24) return `En ${Math.round(hours)} horas`
  const days = Math.round(hours / 24)
  return `En ${days} ${days === 1 ? 'día' : 'días'}`
}

/**
 * Genera pasos siguientes basados en el tipo de cita
 */
function generateNextSteps(type: AppointmentType, locale: string = 'es'): string[] {
  const steps = {
    es: {
      consultation: [
        'Recibirás un email de confirmación en los próximos minutos',
        'Te contactaremos para coordinar fecha y hora específica',
        'Prepara una lista de preguntas o temas a discutir',
        'Revisa nuestros servicios en https://evolve2digital.com'
      ],
      meeting: [
        'Confirmaremos la reunión por email',
        'Recibirás un enlace de calendario con los detalles',
        'Prepara la agenda y materiales necesarios',
        'Te enviaremos el enlace de videollamada 1 hora antes'
      ],
      support: [
        'Tu solicitud ha sido registrada con alta prioridad',
        'Un especialista revisará tu caso inmediatamente',
        'Recibirás actualizaciones por email',
        'Mantén disponible la información técnica relevante'
      ],
      collaboration: [
        'Evaluaremos tu propuesta de colaboración',
        'Te contactaremos para una llamada inicial',
        'Prepara información sobre tu proyecto',
        'Revisaremos posibles sinergias y oportunidades'
      ],
      other: [
        'Hemos recibido tu solicitud',
        'Te contactaremos según la naturaleza de tu consulta',
        'Mantente atento a tu email',
        'Puedes contactarnos directamente si es urgente'
      ]
    },
    en: {
      consultation: [
        'You will receive a confirmation email in the next few minutes',
        'We will contact you to coordinate specific date and time',
        'Prepare a list of questions or topics to discuss',
        'Review our services at https://evolve2digital.com'
      ],
      meeting: [
        'We will confirm the meeting by email',
        'You will receive a calendar link with details',
        'Prepare the agenda and necessary materials',
        'We will send you the video call link 1 hour before'
      ],
      support: [
        'Your request has been registered with high priority',
        'A specialist will review your case immediately',
        'You will receive updates by email',
        'Keep relevant technical information available'
      ],
      collaboration: [
        'We will evaluate your collaboration proposal',
        'We will contact you for an initial call',
        'Prepare information about your project',
        'We will review possible synergies and opportunities'
      ],
      other: [
        'We have received your request',
        'We will contact you according to the nature of your inquiry',
        'Stay tuned to your email',
        'You can contact us directly if it is urgent'
      ]
    }
  }
  
  return steps[locale as keyof typeof steps]?.[type] || steps.es[type]
}

/**
 * Valida parámetros de entrada
 */
function validateAppointmentRequest(data: any) {
  const errors: string[] = []
  
  // Validar campos requeridos
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long')
  }
  
  if (!data.email || typeof data.email !== 'string' || !isValidEmail(data.email)) {
    errors.push('Valid email address is required')
  }
  
  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length < 5) {
    errors.push('Subject is required and must be at least 5 characters long')
  }
  
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Message is required and must be at least 10 characters long')
  }
  
  if (!data.type || !TOOL_CONFIG.allowedTypes.includes(data.type)) {
    errors.push(`Type must be one of: ${TOOL_CONFIG.allowedTypes.join(', ')}`)
  }
  
  // Validar longitudes máximas
  if (data.name && data.name.length > TOOL_CONFIG.maxNameLength) {
    errors.push(`Name must not exceed ${TOOL_CONFIG.maxNameLength} characters`)
  }
  
  if (data.email && data.email.length > TOOL_CONFIG.maxEmailLength) {
    errors.push(`Email must not exceed ${TOOL_CONFIG.maxEmailLength} characters`)
  }
  
  if (data.subject && data.subject.length > TOOL_CONFIG.maxSubjectLength) {
    errors.push(`Subject must not exceed ${TOOL_CONFIG.maxSubjectLength} characters`)
  }
  
  if (data.message && data.message.length > TOOL_CONFIG.maxMessageLength) {
    errors.push(`Message must not exceed ${TOOL_CONFIG.maxMessageLength} characters`)
  }
  
  // Validar campos opcionales
  if (data.preferredDate && !isValidDate(data.preferredDate)) {
    errors.push('Preferred date must be a valid ISO 8601 datetime string')
  }
  
  if (data.timezone && !isValidTimezone(data.timezone)) {
    errors.push('Invalid timezone identifier')
  }
  
  if (data.locale && !['es', 'en'].includes(data.locale)) {
    errors.push('Locale must be either "es" or "en"')
  }
  
  if (data.urgency && !['low', 'medium', 'high'].includes(data.urgency)) {
    errors.push('Urgency must be one of: low, medium, high')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Simula el procesamiento de la cita (en un caso real, aquí se integraría con un CRM, base de datos, etc.)
 */
async function processAppointment(request: AppointmentRequest): Promise<{
  success: boolean
  appointmentId?: string
  error?: string
}> {
  try {
    // Simular procesamiento asíncrono
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // En un caso real, aquí se haría:
    // 1. Guardar en base de datos
    // 2. Enviar email de confirmación
    // 3. Integrar con calendario
    // 4. Notificar al equipo
    // 5. Crear entrada en CRM
    
    const appointmentId = generateAppointmentId()
    
    // Log de la cita creada (en un caso real, usar un logger apropiado)
    console.log('MCP Appointment Created:', {
      id: appointmentId,
      type: request.type,
      email: request.email,
      subject: request.subject,
      timestamp: new Date().toISOString(),
      urgency: request.urgency || 'medium'
    })
    
    return {
      success: true,
      appointmentId
    }
    
  } catch (error) {
    console.error('Error processing appointment:', error)
    return {
      success: false,
      error: 'Failed to process appointment request'
    }
  }
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
 * Maneja solicitudes POST
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const userAgent = request.headers.get('user-agent') || undefined
  
  // Verificar rate limiting
  const rateLimitCheck = createRateLimitMiddleware('appointments.create')(request)
  if (!rateLimitCheck.allowed) {
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/appointments/create',
      'POST',
      false,
      Date.now() - startTime,
      429,
      userAgent,
      undefined,
      'Rate limit exceeded'
    )
    
    return NextResponse.json(
      {
        tool: TOOL_CONFIG.name,
        error: 'Rate limit exceeded',
        message: `Too many appointment requests. Try again in ${rateLimitCheck.retryAfter} seconds.`,
        retryAfter: rateLimitCheck.retryAfter,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 429,
        headers: {
          ...corsHeaders,
          ...mcpHeaders,
          ...getRateLimitHeaders(rateLimitCheck),
        }
      }
    )
  }
  
  let requestData: any
  
  try {
    requestData = await request.json()
  } catch {
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/appointments/create',
      'POST',
      false,
      Date.now() - startTime,
      400,
      userAgent,
      undefined,
      'Invalid JSON in request body'
    )
    
    return NextResponse.json(
      {
        tool: TOOL_CONFIG.name,
        error: 'Invalid request',
        message: 'Request body must be valid JSON',
        timestamp: new Date().toISOString(),
      },
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          ...mcpHeaders,
          ...getRateLimitHeaders(rateLimitCheck),
        }
      }
    )
  }

  try {
    // Validar entrada
    const validation = validateAppointmentRequest(requestData)
    if (!validation.valid) {
      mcpLogger.logToolInvocation(
        TOOL_CONFIG.name,
        '/api/mcp/tools/appointments/create',
        'POST',
        false,
        Date.now() - startTime,
        400,
        userAgent,
        requestData.email || undefined,
        `Validation failed: ${validation.errors.join(', ')}`
      )
      
      return NextResponse.json(
        {
          tool: TOOL_CONFIG.name,
          error: 'Validation failed',
          message: 'Invalid appointment request data',
          details: validation.errors,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            ...mcpHeaders,
            ...getRateLimitHeaders(rateLimitCheck),
          }
        }
      )
    }
    
    // Procesar solicitud de cita
    const result = await processAppointment(requestData as AppointmentRequest)
    
    if (!result.success) {
      mcpLogger.logToolInvocation(
        TOOL_CONFIG.name,
        '/api/mcp/tools/appointments/create',
        'POST',
        false,
        Date.now() - startTime,
        500,
        userAgent,
        requestData.email || undefined,
        result.error || 'Failed to create appointment'
      )
      
      return NextResponse.json(
        {
          tool: TOOL_CONFIG.name,
          error: 'Processing failed',
          message: result.error || 'Failed to process appointment request',
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
        {
          status: 500,
          headers: {
            ...corsHeaders,
            ...mcpHeaders,
            ...getRateLimitHeaders(rateLimitCheck),
          }
        }
      )
    }
    
    // Preparar respuesta exitosa
    const locale = requestData.locale || 'es'
    const response: ToolResponse = {
      tool: TOOL_CONFIG.name,
      success: true,
      appointmentId: result.appointmentId,
      message: locale === 'es' 
        ? 'Cita creada exitosamente. Te contactaremos pronto.'
        : 'Appointment created successfully. We will contact you soon.',
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: {
        type: requestData.type,
        locale,
        version: TOOL_CONFIG.version,
        estimatedResponse: estimateResponseTime(requestData.type, requestData.urgency)
      },
      nextSteps: generateNextSteps(requestData.type, locale)
    }
    
    // Log exitoso
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/appointments/create',
      'POST',
      true,
      Date.now() - startTime,
      201,
      userAgent,
      requestData.email,
      undefined,
      {
        appointmentId: result.appointmentId,
        type: requestData.type,
        urgency: requestData.urgency || 'medium',
        hasPreferredDate: !!requestData.preferredDate
      }
    )
    
    return NextResponse.json(response, {
      status: 201,
      headers: {
        ...corsHeaders,
        ...mcpHeaders,
        ...getRateLimitHeaders(rateLimitCheck),
        'Content-Type': 'application/json; charset=utf-8',
      }
    })
    
  } catch (error) {
    console.error('MCP appointments.create Error:', error)
    
    // Log error
    mcpLogger.logToolInvocation(
      TOOL_CONFIG.name,
      '/api/mcp/tools/appointments/create',
      'POST',
      false,
      Date.now() - startTime,
      500,
      userAgent,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    )
    
    return NextResponse.json(
      {
        tool: TOOL_CONFIG.name,
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          ...mcpHeaders,
          ...getRateLimitHeaders(rateLimitCheck),
        }
      }
    )
  }
}

/**
 * Maneja métodos no permitidos
 */
export async function GET() {
  return NextResponse.json(
    {
      tool: TOOL_CONFIG.name,
      error: 'Method not allowed',
      message: 'This tool only supports POST requests',
      allowedMethods: ['POST', 'OPTIONS']
    },
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Allow': 'POST, OPTIONS',
      }
    }
  )
}

export { GET as PUT, GET as DELETE, GET as PATCH }
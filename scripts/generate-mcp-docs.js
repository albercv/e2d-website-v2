#!/usr/bin/env node

/**
 * Generate MCP Documentation
 * 
 * Script que genera documentación automática para los endpoints MCP
 * basándose en los archivos de la API y sus comentarios JSDoc.
 * 
 * Genera:
 * - docs/mcp-usage.md
 * - docs/mcp-examples.md
 * - docs/mcp-changelog.md
 */

const fs = require('fs')
const path = require('path')

/**
 * Configuración del generador
 */
const CONFIG = {
  mcpApiDir: path.join(process.cwd(), 'app/api/mcp'),
  docsDir: path.join(process.cwd(), 'docs'),
  outputFiles: {
    usage: 'mcp-usage.md',
    examples: 'mcp-examples.md',
    changelog: 'mcp-changelog.md'
  }
}

/**
 * Extrae información de un archivo de ruta MCP
 */
function extractMCPInfo(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Extraer comentarios JSDoc del inicio del archivo
    const jsdocMatch = content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//)
    if (!jsdocMatch) return null
    
    const jsdoc = jsdocMatch[1]
    
    // Extraer información específica
    const info = {
      description: '',
      route: '',
      tool: '',
      category: '',
      public: false,
      admin: false,
      security: '',
      rateLimit: '',
      methods: []
    }
    
    // Parsear líneas del JSDoc
    const lines = jsdoc.split('\n').map(line => line.replace(/^\s*\*\s?/, ''))
    
    let currentDescription = []
    for (const line of lines) {
      if (line.startsWith('@route ')) {
        info.route = line.replace('@route ', '').trim()
      } else if (line.startsWith('@tool ')) {
        info.tool = line.replace('@tool ', '').trim()
      } else if (line.startsWith('@category ')) {
        info.category = line.replace('@category ', '').trim()
      } else if (line.startsWith('@public ')) {
        info.public = line.replace('@public ', '').trim() === 'true'
      } else if (line.startsWith('@admin ')) {
        info.admin = line.replace('@admin ', '').trim() === 'true'
      } else if (line.startsWith('@security ')) {
        info.security = line.replace('@security ', '').trim()
      } else if (line.startsWith('@ratelimit ')) {
        info.rateLimit = line.replace('@ratelimit ', '').trim()
      } else if (!line.startsWith('@') && line.trim()) {
        currentDescription.push(line.trim())
      }
    }
    
    info.description = currentDescription.join(' ').trim()
    
    // Detectar métodos HTTP exportados
    const exportMatches = content.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || []
    const namedExports = content.match(/export\s*\{\s*([^}]+)\s*\}/g) || []
    
    exportMatches.forEach(match => {
      const method = match.match(/function\s+(\w+)/)?.[1]
      if (method && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(method)) {
        info.methods.push(method)
      }
    })
    
    namedExports.forEach(match => {
      const exports = match.match(/\{\s*([^}]+)\s*\}/)?.[1] || ''
      const methods = exports.split(',').map(exp => exp.trim().split(' as ')[0])
      methods.forEach(method => {
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(method)) {
          info.methods.push(method)
        }
      })
    })
    
    return info
  } catch (error) {
    console.error(`Error extracting info from ${filePath}:`, error.message)
    return null
  }
}

/**
 * Escanea recursivamente el directorio MCP
 */
function scanMCPDirectory(dir, basePath = '') {
  const endpoints = []
  
  try {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        // Recursión en subdirectorios
        endpoints.push(...scanMCPDirectory(itemPath, path.join(basePath, item)))
      } else if (item === 'route.ts' || item === 'route.js') {
        // Archivo de ruta encontrado
        const info = extractMCPInfo(itemPath)
        if (info) {
          info.path = basePath
          info.filePath = itemPath
          endpoints.push(info)
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message)
  }
  
  return endpoints
}

/**
 * Genera documentación de uso
 */
function generateUsageDocs(endpoints) {
  const content = `# MCP Usage Documentation

## Evolve2Digital MCP Server

Este documento describe cómo usar los endpoints MCP (Model Context Protocol) de Evolve2Digital.

### Base URL
\`\`\`
${process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'}
\`\`\`

### Manifest
Para obtener el manifest completo del servidor MCP:
\`\`\`
GET /api/mcp/manifest
\`\`\`

## Endpoints Disponibles

${endpoints.map(endpoint => `
### ${endpoint.tool || endpoint.route}

**Descripción:** ${endpoint.description}

**Ruta:** \`${endpoint.route}\`
**Métodos:** ${endpoint.methods.join(', ')}
**Categoría:** ${endpoint.category || 'general'}
${endpoint.public ? '**Acceso:** Público' : ''}
${endpoint.admin ? '**Acceso:** Administrativo' : ''}
${endpoint.security ? `**Seguridad:** ${endpoint.security}` : ''}
${endpoint.rateLimit ? `**Rate Limit:** ${endpoint.rateLimit}` : ''}

`).join('')}

## Autenticación

### Endpoints Públicos
Los endpoints marcados como públicos no requieren autenticación.

### Endpoints Administrativos
Los endpoints administrativos requieren autenticación básica:
\`\`\`
Authorization: Basic <base64(username:password)>
\`\`\`

## Rate Limiting

Todos los endpoints tienen límites de velocidad para prevenir abuso:
- **Endpoints públicos:** 100 requests/minuto por IP
- **Endpoints de herramientas:** 10 requests/hora por IP
- **Endpoints administrativos:** 50 requests/hora por IP autenticado

## Headers Recomendados

\`\`\`
Content-Type: application/json
User-Agent: YourAI/1.0
Accept: application/json
\`\`\`

## Manejo de Errores

Todos los endpoints devuelven errores en formato JSON:
\`\`\`json
{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Códigos de Estado Comunes
- **200:** Éxito
- **400:** Solicitud inválida
- **401:** No autorizado
- **403:** Prohibido
- **429:** Rate limit excedido
- **500:** Error interno del servidor

---

*Documentación generada automáticamente el ${new Date().toISOString()}*
`

  return content
}

/**
 * Genera documentación de ejemplos
 */
function generateExamplesDocs(endpoints) {
  const toolEndpoints = endpoints.filter(e => e.tool)
  
  const content = `# MCP Examples Documentation

## Ejemplos de Uso de Herramientas MCP

Esta documentación proporciona ejemplos prácticos de cómo usar las herramientas MCP de Evolve2Digital.

${toolEndpoints.map(endpoint => `
## ${endpoint.tool}

**Descripción:** ${endpoint.description}

### Ejemplo de Solicitud

\`\`\`bash
curl -X ${endpoint.methods[0] || 'POST'} \\
  "${process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'}${endpoint.route}" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: YourAI/1.0" \\
  ${endpoint.methods[0] === 'GET' ? '' : '-d \'{"example": "data"}\' \\'}
\`\`\`

### Ejemplo de Respuesta

\`\`\`json
{
  "tool": "${endpoint.tool}",
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "processingTime": 150
}
\`\`\`

`).join('')}

## Ejemplos de Integración

### JavaScript/Node.js

\`\`\`javascript
const mcpClient = {
  baseUrl: '${process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'}',
  
  async callTool(toolName, data) {
    const response = await fetch(\`\${this.baseUrl}/api/mcp/tools/\${toolName}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyAI/1.0'
      },
      body: JSON.stringify(data)
    })
    
    return response.json()
  }
}

// Ejemplo de uso
const result = await mcpClient.callTool('posts/search', {
  query: 'microservicios',
  locale: 'es',
  limit: 5
})
\`\`\`

### Python

\`\`\`python
import requests
import json

class MCPClient:
    def __init__(self, base_url="${process.env.NEXT_PUBLIC_BASE_URL || 'https://evolve2digital.com'}"):
        self.base_url = base_url
    
    def call_tool(self, tool_name, data):
        url = f"{self.base_url}/api/mcp/tools/{tool_name}"
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'MyAI/1.0'
        }
        
        response = requests.post(url, headers=headers, json=data)
        return response.json()

# Ejemplo de uso
client = MCPClient()
result = client.call_tool('posts/search', {
    'query': 'microservicios',
    'locale': 'es',
    'limit': 5
})
\`\`\`

---

*Documentación generada automáticamente el ${new Date().toISOString()}*
`

  return content
}

/**
 * Genera changelog
 */
function generateChangelogDocs() {
  const content = `# MCP Changelog

## Historial de Cambios del Servidor MCP

### v1.0.0 - ${new Date().toISOString().split('T')[0]}

#### Añadido
- Servidor MCP inicial con protocolo 1.0
- Herramienta \`agent.query\` para consultas al agente IA
- Herramienta \`posts.search\` para búsqueda de artículos
- Herramienta \`appointments.create\` para crear citas
- Endpoint de manifest MCP
- Endpoint de logs administrativos
- Sistema de rate limiting
- Logging completo de actividad
- Documentación automática

#### Características
- Soporte para múltiples modelos de IA (GPT-4, Claude, Gemini)
- Respuestas multiidioma (español/inglés)
- Rate limiting por IP
- Autenticación básica para endpoints admin
- Headers CORS optimizados para IA
- Cache inteligente de respuestas
- Métricas de rendimiento

#### Seguridad
- Rate limiting por endpoint
- Validación de entrada
- Sanitización de datos
- Headers de seguridad
- Logging de actividad sospechosa

---

*Changelog generado automáticamente el ${new Date().toISOString()}*
`

  return content
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Generando documentación MCP...')
    
    // Crear directorio docs si no existe
    if (!fs.existsSync(CONFIG.docsDir)) {
      fs.mkdirSync(CONFIG.docsDir, { recursive: true })
      console.log('📁 Directorio docs creado')
    }
    
    // Escanear endpoints MCP
    console.log('🔍 Escaneando endpoints MCP...')
    const endpoints = scanMCPDirectory(CONFIG.mcpApiDir)
    console.log(`📋 Encontrados ${endpoints.length} endpoints`)
    
    // Generar documentación de uso
    console.log('📝 Generando documentación de uso...')
    const usageDocs = generateUsageDocs(endpoints)
    const usagePath = path.join(CONFIG.docsDir, CONFIG.outputFiles.usage)
    fs.writeFileSync(usagePath, usageDocs, 'utf8')
    console.log(`✅ Generado: ${usagePath}`)
    
    // Generar documentación de ejemplos
    console.log('📝 Generando documentación de ejemplos...')
    const examplesDocs = generateExamplesDocs(endpoints)
    const examplesPath = path.join(CONFIG.docsDir, CONFIG.outputFiles.examples)
    fs.writeFileSync(examplesPath, examplesDocs, 'utf8')
    console.log(`✅ Generado: ${examplesPath}`)
    
    // Generar changelog
    console.log('📝 Generando changelog...')
    const changelogDocs = generateChangelogDocs()
    const changelogPath = path.join(CONFIG.docsDir, CONFIG.outputFiles.changelog)
    fs.writeFileSync(changelogPath, changelogDocs, 'utf8')
    console.log(`✅ Generado: ${changelogPath}`)
    
    console.log('🎉 Documentación MCP generada exitosamente!')
    
    return {
      success: true,
      endpoints: endpoints.length,
      files: [usagePath, examplesPath, changelogPath]
    }
    
  } catch (error) {
    console.error('❌ Error generando documentación MCP:', error)
    throw error
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { main }
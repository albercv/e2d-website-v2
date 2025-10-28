# API Endpoint: `/api/answers`

## 🎯 Propósito

El endpoint `/api/answers` proporciona una interfaz estructurada para que las inteligencias artificiales (GPTBot, ChatGPT, Claude, Gemini) puedan consultar y obtener respuestas concisas basadas en el contenido del sitio web.

## 📋 Especificaciones Técnicas

### URL Base
```
https://evolve2digital.com/api/answers
```

### Métodos HTTP Soportados
- `GET` - Consulta principal
- `OPTIONS` - Preflight CORS

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `query` | string | ✅ | Consulta en texto libre (máx. 500 caracteres) | `whatsapp` |
| `locale` | string | ❌ | Idioma preferido (`es`, `en`) | `es` |
| `limit` | number | ❌ | Límite de resultados (1-5, por defecto: 1) | `1` |

### Headers de Respuesta

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, User-Agent, X-Requested-With
Cache-Control: public, max-age=300, s-maxage=300
X-AI-Accessible: true
X-Content-Type: structured-data
X-Robots-Tag: noindex, nofollow
```

## 📤 Estructura de Respuesta

### Respuesta Exitosa (200)

```json
{
  "query": "whatsapp",
  "answer": "Según el artículo \"Cómo automatizar WhatsApp para clínicas: Guía completa 2024\", **Un 28% de reducción en no-shows** es posible con la automatización correcta de WhatsApp",
  "source": "https://evolve2digital.com/es/blog/automatizar-whatsapp-clinicas",
  "sourceTitle": "Cómo automatizar WhatsApp para clínicas: Guía completa 2024",
  "lastUpdated": "2024-01-15T00:00:00.000Z",
  "locale": "es",
  "confidence": 1,
  "relatedTags": ["WhatsApp", "Automatización", "Clínicas", "Chatbots", "Healthcare"],
  "readingTime": {
    "minutes": 2,
    "words": 333,
    "text": "2 min de lectura"
  },
  "metadata": {
    "contentType": "blog_post",
    "author": "Alberto Carrasco",
    "wordCount": 424,
    "publishedDate": "2024-01-15T00:00:00.000Z"
  },
  "timestamp": "2025-10-28T16:11:35.404Z",
  "processingTime": 2,
  "apiVersion": "1.0.0",
  "endpoint": "/api/answers"
}
```

### Sin Resultados (404)

```json
{
  "query": "inteligencia artificial",
  "answer": null,
  "message": "No relevant content found for this query",
  "suggestions": [
    "Intenta usar términos más generales",
    "Busca por temas como: automatización, chatbots, desarrollo web",
    "Revisa los tags disponibles para ideas",
    "Tags disponibles: WhatsApp, Automatización, Clínicas, Chatbots, Healthcare"
  ],
  "code": "NO_RESULTS",
  "timestamp": "2025-10-28T16:11:44.740Z",
  "processingTime": 1
}
```

### Error de Validación (400)

```json
{
  "error": "Validation failed",
  "details": {
    "query": "Query is required and must be between 1 and 500 characters"
  },
  "timestamp": "2025-10-28T16:11:44.740Z"
}
```

## 🔍 Algoritmo de Búsqueda

El servicio utiliza múltiples estrategias de matching:

1. **Coincidencia de Título** (peso: 3.0)
2. **Coincidencia de Descripción** (peso: 2.0)
3. **Coincidencia de Tags** (peso: 2.5)
4. **Coincidencia de Contenido** (peso: 1.0)

### Puntuación de Relevancia

- **Coincidencia exacta**: 1.0
- **Coincidencia parcial**: 0.5
- **Coincidencia de palabras**: proporcional al número de palabras coincidentes

## 📝 Ejemplos de Uso

### cURL

```bash
# Consulta básica
curl -X GET "https://evolve2digital.com/api/answers?query=whatsapp" \
  -H "Accept: application/json"

# Con parámetros adicionales
curl -X GET "https://evolve2digital.com/api/answers?query=automatización&locale=es&limit=1" \
  -H "Accept: application/json"
```

### JavaScript/Fetch

```javascript
async function queryAI(query, locale = 'es') {
  const response = await fetch(
    `https://evolve2digital.com/api/answers?query=${encodeURIComponent(query)}&locale=${locale}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Bot/1.0'
      }
    }
  );
  
  return await response.json();
}

// Uso
const result = await queryAI('WhatsApp automation');
console.log(result.answer);
```

### Python

```python
import requests
import urllib.parse

def query_ai_endpoint(query, locale='es'):
    url = f"https://evolve2digital.com/api/answers"
    params = {
        'query': query,
        'locale': locale
    }
    
    response = requests.get(url, params=params, headers={
        'Accept': 'application/json',
        'User-Agent': 'AI-Bot/1.0'
    })
    
    return response.json()

# Uso
result = query_ai_endpoint('automatización WhatsApp')
print(result['answer'])
```

## 🚀 Optimizaciones

### Cache
- **Duración**: 5 minutos (300 segundos)
- **Tipo**: Público (CDN compatible)
- **Headers**: `Cache-Control: public, max-age=300`

### Rate Limiting
- Implementado a nivel de middleware
- Configuración específica para bots de IA

### Performance
- Respuestas típicas: < 50ms
- Búsqueda optimizada en memoria
- Snippets de contenido limitados a 200 caracteres

## 🔒 Seguridad y Privacidad

- **Sin autenticación requerida** (acceso público)
- **CORS habilitado** para todos los orígenes
- **No indexación** por motores de búsqueda (`X-Robots-Tag: noindex`)
- **Logging mínimo** para privacidad
- **Validación estricta** de parámetros de entrada

## 📊 Monitoreo

### Métricas Disponibles
- Número total de consultas procesadas
- Tiempo promedio de respuesta
- Tasa de éxito/error
- Consultas más frecuentes

### Logs
- Errores de validación
- Consultas sin resultados
- Tiempos de respuesta elevados

## 🔄 Actualización de Contenido

El endpoint se actualiza automáticamente cuando:
- Se publican nuevos posts
- Se modifica contenido existente
- Se ejecuta el build del sitio
- Se reinicia el servidor

## 🧪 Testing

### Casos de Prueba Recomendados

1. **Consulta exitosa**: `whatsapp`
2. **Sin resultados**: `inteligencia artificial`
3. **Consulta vacía**: `` (debe retornar 400)
4. **Consulta muy larga**: `>500 caracteres` (debe retornar 400)
5. **Locale inválido**: `locale=invalid`

### Validación de Headers

```bash
curl -I "https://evolve2digital.com/api/answers?query=test"
```

Debe incluir:
- `X-AI-Accessible: true`
- `Access-Control-Allow-Origin: *`
- `Cache-Control: public, max-age=300`

## 📚 Integración con IA

### Para GPTBot/ChatGPT
- Usar `User-Agent: GPTBot` o `ChatGPT-User`
- Respetar headers de cache
- Procesar respuestas JSON estructuradas

### Para Claude
- Usar `User-Agent: Claude-Web`
- Manejar casos de `answer: null`
- Utilizar `suggestions` para consultas alternativas

### Para Gemini
- Usar `User-Agent: GoogleOther`
- Procesar `relatedTags` para contexto adicional
- Considerar `confidence` para validación

## 🐛 Troubleshooting

### Problemas Comunes

1. **400 Bad Request**: Verificar parámetros de consulta
2. **404 Not Found**: Contenido no disponible para la consulta
3. **500 Internal Error**: Error del servidor (revisar logs)

### Debugging

```bash
# Verificar disponibilidad
curl -v "https://evolve2digital.com/api/answers?query=test"

# Verificar CORS
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS "https://evolve2digital.com/api/answers"
```
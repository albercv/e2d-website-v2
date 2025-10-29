# MCP Agent Endpoint Documentation

## Overview

The MCP Agent endpoint (`/api/mcp/tools/agent/query`) provides an intelligent AI-powered query interface that leverages the E2D knowledge base to answer user questions. This endpoint is part of the Model Context Protocol (MCP) implementation and offers rate-limited, validated access to AI-generated responses.

## Endpoint Details

- **URL**: `/api/mcp/tools/agent/query`
- **Methods**: `POST`, `OPTIONS`
- **Content-Type**: `application/json`
- **Rate Limit**: 20 requests per hour per IP/User-Agent combination

## Request Format

### POST Request

```json
{
  "prompt": "string (required, max 800 characters)",
  "locale": "string (optional, default: 'es')",
  "includeContext": "boolean (optional, default: true)"
}
```

#### Parameters

- **prompt** (required): The user's question or query
  - Type: `string`
  - Constraints: 1-800 characters, cannot be empty or whitespace-only
  - Example: `"¿Cómo puedo mejorar el SEO de mi sitio web?"`

- **locale** (optional): Language preference for the response
  - Type: `string`
  - Supported values: `"es"`, `"en"`
  - Default: `"es"`

- **includeContext** (optional): Whether to include additional context metadata
  - Type: `boolean`
  - Default: `true`

## Response Format

### Successful Response (200)

```json
{
  "response": "string",
  "source": "E2D Agent",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "confidence": 0.9,
  "metadata": {
    "agent": "E2D Assistant",
    "version": "1.0.0",
    "processing_time_ms": 150,
    "source_article": "Article Title (if includeContext=true)",
    "source_url": "https://example.com/article (if includeContext=true)",
    "related_tags": ["tag1", "tag2"],
    "content_type": "blog_post",
    "author": "Author Name"
  }
}
```

### Fallback Response (200)

When no specific information is found in the knowledge base:

```json
{
  "response": "Lo siento, no pude encontrar información específica sobre tu consulta...",
  "source": "E2D Agent",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "confidence": 0,
  "metadata": {
    "agent": "E2D Assistant",
    "version": "1.0.0",
    "processing_time_ms": 50
  }
}
```

### Error Responses

#### Rate Limit Exceeded (429)

```json
{
  "error": "Rate limit exceeded. Try again later.",
  "retryAfter": 300
}
```

**Headers:**
- `Retry-After`: Seconds until next allowed request
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Reset time in ISO format

#### Validation Errors (400)

```json
{
  "error": "Missing or invalid prompt parameter"
}
```

Common validation errors:
- `"Invalid JSON body"`
- `"Missing or invalid prompt parameter"`
- `"Prompt cannot be empty"`
- `"Prompt exceeds maximum length of 800 characters"`
- `"Unsupported locale. Supported: es, en"`

#### Server Error (500)

```json
{
  "error": "Internal server error",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Response Headers

All responses include these headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `X-MCP-Tool: agent.query`

Successful responses also include:

- `X-Processing-Time`: Processing time in milliseconds
- `X-Confidence`: AI confidence score (0-1)
- `X-RateLimit-Limit`: Rate limit maximum
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time in ISO format

## Usage Examples

### Basic Query (Spanish)

```bash
curl -X POST http://localhost:3000/api/mcp/tools/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "¿Qué servicios ofrece E2D?"
  }'
```

### English Query with Context

```bash
curl -X POST http://localhost:3000/api/mcp/tools/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What web development services do you offer?",
    "locale": "en",
    "includeContext": true
  }'
```

### CORS Preflight

```bash
curl -X OPTIONS http://localhost:3000/api/mcp/tools/agent/query \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

## Rate Limiting

The endpoint implements rate limiting to prevent abuse:

- **Limit**: 20 requests per hour
- **Identification**: Based on IP address and User-Agent combination
- **Reset**: Rolling window, resets hourly
- **Headers**: Rate limit information included in all responses

## Security Features

1. **Input Validation**: Strict validation of all input parameters
2. **Rate Limiting**: Prevents abuse and ensures fair usage
3. **CORS Support**: Proper CORS headers for cross-origin requests
4. **Error Handling**: Graceful error handling with appropriate HTTP status codes
5. **Logging**: Comprehensive logging of all requests and errors

## Integration with AI Service

The endpoint integrates with the internal AI answers service:

1. **Query Processing**: Searches the E2D knowledge base
2. **Confidence Scoring**: Provides confidence levels for responses
3. **Fallback Handling**: Returns generic responses when no specific information is found
4. **Context Enrichment**: Includes source articles and metadata when available

## Monitoring and Logging

All requests are logged with:

- Tool invocation details
- Processing times
- Success/failure status
- Rate limit events
- Error details with stack traces

## MCP Manifest Integration

The tool is registered in the MCP manifest with:

- **Name**: `agent.query`
- **Category**: `ai_assistant`
- **Description**: Detailed tool description and usage instructions
- **Input/Output Schemas**: Complete JSON schemas for validation
- **Rate Limits**: Configured limits and policies

## Testing

Comprehensive test suite covers:

- ✅ CORS handling
- ✅ Rate limiting enforcement
- ✅ Input validation (all edge cases)
- ✅ Successful AI responses
- ✅ Fallback responses
- ✅ Error handling
- ✅ Logging verification
- ✅ Header validation

Test coverage: **100%** of critical paths

## Performance Considerations

- **Response Time**: Typically 100-500ms depending on query complexity
- **Memory Usage**: Minimal, stateless operation
- **Caching**: Leverages AI service caching for improved performance
- **Rate Limiting**: In-memory implementation with automatic cleanup

## Troubleshooting

### Common Issues

1. **429 Rate Limit**: Wait for the retry-after period or check rate limit headers
2. **400 Validation Error**: Verify request format and parameter constraints
3. **500 Server Error**: Check server logs for detailed error information

### Debug Headers

Use these headers to debug issues:

- `X-Processing-Time`: Check if requests are timing out
- `X-Confidence`: Understand AI response quality
- `X-RateLimit-*`: Monitor rate limit status

### Logging

All requests are logged with correlation IDs for easy debugging. Check application logs for detailed error information.
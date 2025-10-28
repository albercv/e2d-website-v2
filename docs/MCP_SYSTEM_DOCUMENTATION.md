# MCP System Documentation

## Overview

This document provides comprehensive technical documentation for the Model Context Protocol (MCP) system implementation in the Evolve2Digital website. The MCP system enables AI assistants like ChatGPT and Claude to interact with the website's content and services through standardized API endpoints.

## Architecture

### System Components

```
/api/mcp/
├── manifest                    # MCP manifest endpoint
├── tools/
│   ├── posts/
│   │   └── search/            # Blog post search tool
│   └── appointments/
│       └── create/            # Appointment creation tool
└── logs/                      # Logging and monitoring endpoint
```

### Core Libraries

- **Rate Limiting**: `/lib/mcp-rate-limiter.ts` - Implements sliding window rate limiting
- **Logging**: `/lib/mcp-logger.ts` - Centralized logging for MCP operations
- **Validation**: Uses Zod schemas for request validation

## API Endpoints

### 1. Manifest Endpoint

**Endpoint**: `GET /api/mcp/manifest`

**Purpose**: Provides MCP-compliant manifest describing available tools and their schemas.

**Response Structure**:
```json
{
  "schemaVersion": "2024-11-05",
  "vendor": "evolve2digital",
  "name": "E2D Website MCP Server",
  "version": "1.0.0",
  "tools": {
    "posts.search": { ... },
    "appointments.create": { ... }
  }
}
```

### 2. Posts Search Tool

**Endpoint**: `GET /api/mcp/tools/posts/search`

**Purpose**: Searches blog posts with relevance scoring and locale filtering.

**Parameters**:
- `query` (required): Search query string
- `locale` (optional): Language locale (es, en)
- `limit` (optional): Maximum results (default: 10, max: 50)
- `includeContent` (optional): Include content snippets (default: false)

**Rate Limits**:
- 30 requests per minute per IP
- 100 requests per hour per IP

**Response Structure**:
```json
{
  "tool": "posts.search",
  "results": [
    {
      "title": "Post Title",
      "description": "Post description",
      "slug": "post-slug",
      "url": "https://evolve2digital.com/blog/post-slug",
      "date": "2024-01-01",
      "author": "Author Name",
      "tags": ["tag1", "tag2"],
      "relevanceScore": 0.85,
      "contentSnippet": "..."
    }
  ],
  "totalResults": 1,
  "processingTime": 45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Appointments Creation Tool

**Endpoint**: `POST /api/mcp/tools/appointments/create`

**Purpose**: Creates appointment requests with validation and automated responses.

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "subject": "Consultation request",
  "type": "consultation|audit|development",
  "message": "Detailed message",
  "urgency": "low|medium|high",
  "preferredDate": "2024-01-01T10:00:00Z",
  "timezone": "Europe/Madrid"
}
```

**Rate Limits**:
- 5 requests per minute per IP
- 20 requests per hour per IP

**Response Structure**:
```json
{
  "tool": "appointments.create",
  "success": true,
  "appointmentId": "apt_unique_id",
  "message": "Appointment created successfully",
  "processingTime": 102,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metadata": {
    "type": "consultation",
    "locale": "es",
    "version": "1.0.0",
    "estimatedResponse": "En 1 día"
  },
  "nextSteps": [
    "You will receive a confirmation email",
    "We will contact you to coordinate specific date and time"
  ]
}
```

### 4. Logs Endpoint

**Endpoint**: `GET /api/mcp/logs`

**Purpose**: Provides logging and monitoring capabilities (admin access required).

**Authentication**: Basic authentication required

**Parameters**:
- `action`: "stats" | "recent" | "errors"
- `limit`: Number of log entries (for recent/errors)

## Security Implementation

### Rate Limiting

The system implements sliding window rate limiting with the following features:

- **Per-IP tracking**: Each IP address has separate rate limit counters
- **Multiple time windows**: Different limits for minute and hour windows
- **Graceful degradation**: Returns HTTP 429 with retry information
- **Header information**: Includes rate limit headers in all responses

**Rate Limit Headers**:
```
X-RateLimit-Limit-Minute: 30
X-RateLimit-Remaining-Minute: 25
X-RateLimit-Reset-Minute: 1640995200
X-RateLimit-Limit-Hour: 100
X-RateLimit-Remaining-Hour: 95
X-RateLimit-Reset-Hour: 1640998800
```

### Input Validation

All endpoints use Zod schemas for strict input validation:

- **Type safety**: Ensures correct data types
- **Required fields**: Validates presence of mandatory fields
- **Format validation**: Email, date, and string length validation
- **Sanitization**: Prevents injection attacks

### Error Handling

Consistent error response format across all endpoints:

```json
{
  "tool": "tool.name",
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": ["Specific validation errors"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Logging and Monitoring

### Log Structure

All MCP operations are logged with the following structure:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info|warn|error",
  "tool": "tool.name",
  "action": "search|create|validate",
  "ip": "192.168.1.1",
  "userAgent": "User agent string",
  "processingTime": 45,
  "success": true,
  "metadata": {
    "query": "search term",
    "results": 5,
    "locale": "es"
  }
}
```

### Monitoring Capabilities

- **Request tracking**: All MCP requests are logged
- **Performance monitoring**: Processing time tracking
- **Error tracking**: Failed requests with detailed error information
- **Rate limit monitoring**: Track rate limit violations
- **Usage analytics**: Tool usage statistics

## Integration Guide

### ChatGPT Integration

1. **Add MCP Server**: Configure ChatGPT to use the MCP manifest endpoint
2. **Authentication**: No authentication required for tool endpoints
3. **Usage**: ChatGPT can discover and use tools automatically

### Claude Integration

1. **MCP Configuration**: Add server configuration in Claude settings
2. **Manifest Discovery**: Claude will fetch available tools from manifest
3. **Tool Execution**: Claude can execute tools based on user requests

### Custom Integration

For custom integrations, follow these steps:

1. **Fetch Manifest**: `GET /api/mcp/manifest` to discover available tools
2. **Validate Schemas**: Use provided JSON schemas for request validation
3. **Handle Rate Limits**: Implement retry logic for 429 responses
4. **Error Handling**: Parse error responses and handle gracefully

## Maintenance Guide

### Regular Maintenance Tasks

1. **Log Rotation**: Implement log rotation to prevent disk space issues
2. **Rate Limit Monitoring**: Monitor rate limit violations and adjust limits
3. **Performance Monitoring**: Track processing times and optimize slow queries
4. **Security Updates**: Keep dependencies updated for security patches

### Troubleshooting

#### Common Issues

1. **Empty Search Results**:
   - Check if posts are published (`published: true`)
   - Verify locale filtering
   - Check relevance score calculation (minimum word length)

2. **Rate Limit Errors**:
   - Check current rate limit status
   - Verify IP-based tracking is working
   - Adjust rate limits if necessary

3. **Validation Errors**:
   - Verify request body matches Zod schemas
   - Check required fields are present
   - Validate data types and formats

#### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG_MCP=true
```

### Performance Optimization

1. **Caching**: Implement caching for frequently searched content
2. **Database Indexing**: Ensure proper indexing for search queries
3. **Rate Limit Storage**: Consider Redis for distributed rate limiting
4. **Content Optimization**: Optimize content loading and filtering

## Configuration

### Environment Variables

```bash
# Rate limiting configuration
MCP_RATE_LIMIT_POSTS_MINUTE=30
MCP_RATE_LIMIT_POSTS_HOUR=100
MCP_RATE_LIMIT_APPOINTMENTS_MINUTE=5
MCP_RATE_LIMIT_APPOINTMENTS_HOUR=20

# Logging configuration
MCP_LOG_LEVEL=info
MCP_LOG_RETENTION_DAYS=30

# Security configuration
MCP_ADMIN_USERNAME=admin
MCP_ADMIN_PASSWORD=secure_password
```

### Deployment Considerations

1. **Load Balancing**: Rate limiting works per-instance, consider distributed solutions
2. **Monitoring**: Set up alerts for high error rates or rate limit violations
3. **Backup**: Ensure appointment data is properly backed up
4. **SSL/TLS**: Always use HTTPS in production

## API Versioning

Current version: `1.0.0`

Version information is included in:
- Manifest endpoint response
- Tool response metadata
- Error responses

Future versions will maintain backward compatibility where possible.

## Support and Contact

For technical support or questions about the MCP system:

- **Website**: https://evolve2digital.com
- **Email**: info@evolve2digital.com
- **Documentation**: This document and inline code comments

---

*Last updated: October 28, 2024*
*Version: 1.0.0*
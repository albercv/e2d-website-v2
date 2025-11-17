# MCP (Model Context Protocol) Integration

This project includes a complete MCP server implementation that allows AI assistants like ChatGPT and Claude to interact with the website's content and services.

## 🚀 Quick Start

### For AI Assistants

Add this MCP server to your configuration:

```
Manifest URL: https://evolve2digital.com/api/mcp/manifest
```

### Available Tools

- **`posts.search`** - Search through blog posts with relevance scoring
- **`posts.get`** - Get a single blog post by slug and locale
- **`posts.create`** - Create a new blog post (MDX). Requires API key. Supports optional MCP format
- **`posts.delete`** - Delete a blog post by slug. Requires API key. Supports optional MCP format
- **`appointments.create`** - Create consultation appointment requests
- **`agent.query`** - Query the E2D AI agent for comprehensive answers
- **`search`** - General MCP search tool (POST)
- **`fetch`** - General MCP fetch tool (POST)

## 📋 Features

- ✅ **MCP 2024-11-05 Compliant** - Follows latest MCP specification
- ✅ **Rate Limited** - Prevents abuse with sliding window rate limiting
- ✅ **Multilingual** - Supports Spanish and English content
- ✅ **Validated** - Strict input validation with Zod schemas
- ✅ **Logged** - Comprehensive logging and monitoring
- ✅ **Secure** - Input sanitization and error handling
- ✅ **Mobile-First** - Optimized for mobile AI assistant usage

## 🛠 Development

### Local Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test the manifest endpoint:
   ```bash
   curl http://localhost:3000/api/mcp/manifest | jq
   ```

3. Test post search:
   ```bash
   curl "http://localhost:3000/api/mcp/tools/posts/search?query=IA&locale=es&limit=3" | jq
   ```

4. Test post creation (MCP format via Accept header):
   ```bash
   curl -X POST "http://localhost:3000/api/mcp/tools/posts/create" \
     -H "Content-Type: application/json" \
     -H "Accept: application/mcp+json" \
     -H "Authorization: Bearer local-dev-mcp-key" \
     -d '{
       "title": "Ejemplo título MCP",
       "description": "Descripción de ejemplo para MCP",
       "locale": "es",
       "content": "# Encabezado\n\nContenido de ejemplo del post en formato MDX..."
     }' | jq
   ```

5. Test post deletion (MCP format via POST):
   ```bash
   curl -X POST "http://localhost:3000/api/mcp/tools/posts/delete" \
     -H "Content-Type: application/json" \
     -H "Accept: application/mcp+json" \
     -H "Authorization: Bearer local-dev-mcp-key" \
     -d '{
       "slug": "ejemplo-titulo-mcp",
       "locale": "es"
     }' | jq
   ```

6. Test agent query:
   ```bash
   curl -X POST "http://localhost:3000/api/mcp/tools/agent/query" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "¿Qué servicios ofrece E2D?",
       "locale": "es",
       "includeContext": true
     }' | jq
   ```

## 📊 Rate Limits

| Tool | Per Minute | Per Hour |
|------|------------|----------|
| posts.search | 30 | 100 |
| posts.create | 20 | - |
| posts.delete | 20 | - |
| appointments.create | 5 | 20 |
| agent.query | 10 | 50 |

## 🔧 Configuration

### Environment Variables

```bash
# Rate limiting (optional, has defaults)
MCP_RATE_LIMIT_POSTS_MINUTE=30
MCP_RATE_LIMIT_POSTS_HOUR=100
MCP_RATE_LIMIT_APPOINTMENTS_MINUTE=5
MCP_RATE_LIMIT_APPOINTMENTS_HOUR=20

# External Agent Configuration
E2D_AGENT_WEBHOOK_URL=https://api.evolve2digital.com/webhook/userMessage
E2D_CHAT_USER=your-username
E2D_CHAT_PASSWORD=your-password
E2D_AGENT_API_KEY=your-api-key  # Alternative to basic auth

# MCP Auth for protected tools
E2D_MCP_API_KEY=local-dev-mcp-key

# Optional: base URL used in responses for local testing
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Logging (optional)
MCP_LOG_LEVEL=info
DEBUG_MCP=false

# Admin access for logs endpoint
MCP_ADMIN_USERNAME=admin
MCP_ADMIN_PASSWORD=your_secure_password
```

## 📖 Documentation

- **[Complete Technical Documentation](./docs/MCP_SYSTEM_DOCUMENTATION.md)** - Detailed system architecture, API reference, and maintenance guide
- **[Quick Start Guide](./docs/MCP_QUICK_START_GUIDE.md)** - Simple setup and usage examples

## 🧪 Testing

The MCP system has been tested with:

- ✅ **Manifest Discovery** - AI assistants can discover available tools
- ✅ **Tool Execution** - Both search and appointment tools work correctly
- ✅ **Rate Limiting** - Proper rate limit enforcement and headers
- ✅ **Error Handling** - Graceful error responses with helpful messages
- ✅ **Input Validation** - Strict validation prevents invalid requests
- ✅ **Logging** - All operations are properly logged

## 🔒 Security

- **Rate Limiting**: Prevents abuse with per-IP rate limiting
- **Input Validation**: All inputs validated with Zod schemas
- **Error Handling**: No sensitive information leaked in errors
- **Authentication**: Admin endpoints require basic authentication
- **CORS**: Properly configured for cross-origin requests

## 🚀 Deployment

The MCP system is production-ready and includes:

- Comprehensive error handling
- Performance monitoring
- Security best practices
- Scalable architecture
- Mobile-first design

## 📞 Support

For questions or issues with the MCP implementation:

- **Technical Documentation**: See `/docs/MCP_SYSTEM_DOCUMENTATION.md`
- **Website**: https://evolve2digital.com
- **Email**: info@evolve2digital.com

---

*MCP Integration v1.0.0 - Built with Next.js, TypeScript, and ❤️*
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
- **`appointments.create`** - Create consultation appointment requests

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

4. Test appointment creation:
   ```bash
   curl -X POST "http://localhost:3000/api/mcp/tools/appointments/create" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "name": "Test User",
       "subject": "Test consultation",
       "type": "consultation",
       "message": "Test message",
       "urgency": "medium"
     }' | jq
   ```

### Project Structure

```
/api/mcp/
├── manifest/              # MCP manifest endpoint
├── tools/
│   ├── posts/search/     # Blog post search tool
│   └── appointments/create/ # Appointment creation tool
└── logs/                 # Logging endpoint (admin only)

/lib/
├── mcp-rate-limiter.ts   # Rate limiting implementation
└── mcp-logger.ts         # Centralized logging

/docs/
├── MCP_SYSTEM_DOCUMENTATION.md  # Complete technical docs
└── MCP_QUICK_START_GUIDE.md     # Quick start guide
```

## 📊 Rate Limits

| Tool | Per Minute | Per Hour |
|------|------------|----------|
| posts.search | 30 | 100 |
| appointments.create | 5 | 20 |

## 🔧 Configuration

### Environment Variables

```bash
# Rate limiting (optional, has defaults)
MCP_RATE_LIMIT_POSTS_MINUTE=30
MCP_RATE_LIMIT_POSTS_HOUR=100
MCP_RATE_LIMIT_APPOINTMENTS_MINUTE=5
MCP_RATE_LIMIT_APPOINTMENTS_HOUR=20

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
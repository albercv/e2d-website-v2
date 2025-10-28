# MCP Quick Start Guide

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants like ChatGPT and Claude to interact with your website's content and services. This implementation provides three main tools:

1. **Blog Search**: Search through published blog posts
2. **Appointment Creation**: Create consultation requests
3. **AI Agent**: Intelligent Q&A using E2D knowledge base

## For AI Assistants (ChatGPT/Claude)

### Quick Setup

1. **Add MCP Server**: Use this manifest URL in your MCP configuration:
   ```
   https://evolve2digital.com/api/mcp/manifest
   ```

2. **Available Tools**:
   - `posts.search` - Search blog posts
   - `appointments.create` - Create appointments
   - `agent.query` - AI-powered Q&A assistant

### Example Usage

**Search for posts about automation:**
```
Search for blog posts about "automatización" in Spanish
```

**Create an appointment:**
```
I need to schedule a consultation about web development. 
My email is john@example.com, name is John Doe, 
and I'm available next week.
```

**Ask the AI agent:**
```
What web development services does E2D offer?
```

## For Developers

### Testing the API

#### 1. Search Posts
```bash
curl "https://evolve2digital.com/api/mcp/tools/posts/search?query=IA&locale=es&limit=3" \
  -H "Accept: application/json"
```

#### 2. Create Appointment
```bash
curl -X POST "https://evolve2digital.com/api/mcp/tools/appointments/create" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "John Doe",
    "subject": "Consultation about automation",
    "type": "consultation",
    "message": "I need help with automation",
    "urgency": "medium",
    "preferredDate": "2024-11-15T10:00:00Z",
    "timezone": "Europe/Madrid"
  }'
```

#### 3. Query AI Agent
```bash
curl -X POST "https://evolve2digital.com/api/mcp/tools/agent/query" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "¿Qué servicios de desarrollo web ofrece E2D?",
    "locale": "es",
    "includeContext": true
  }'
```

### Rate Limits

- **Posts Search**: 30/minute, 100/hour per IP
- **Appointments**: 5/minute, 20/hour per IP
- **AI Agent**: 20/hour per IP

### Response Format

All responses include:
- Tool name
- Processing time
- Timestamp
- Rate limit headers

## Integration Examples

### JavaScript/Node.js

```javascript
// Search posts
async function searchPosts(query, locale = 'es', limit = 10) {
  const url = new URL('https://evolve2digital.com/api/mcp/tools/posts/search');
  url.searchParams.set('query', query);
  url.searchParams.set('locale', locale);
  url.searchParams.set('limit', limit.toString());
  
  const response = await fetch(url);
  return response.json();
}

// Create appointment
async function createAppointment(appointmentData) {
  const response = await fetch('https://evolve2digital.com/api/mcp/tools/appointments/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(appointmentData)
  });
  
  return response.json();
}

// Query AI agent
async function queryAgent(prompt, locale = 'es', includeContext = true) {
  const response = await fetch('https://evolve2digital.com/api/mcp/tools/agent/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, locale, includeContext })
  });
  
  return response.json();
}
```

### Python

```python
import requests

def search_posts(query, locale='es', limit=10):
    url = 'https://evolve2digital.com/api/mcp/tools/posts/search'
    params = {
        'query': query,
        'locale': locale,
        'limit': limit
    }
    response = requests.get(url, params=params)
    return response.json()

def create_appointment(appointment_data):
    url = 'https://evolve2digital.com/api/mcp/tools/appointments/create'
    response = requests.post(url, json=appointment_data)
    return response.json()

def query_agent(prompt, locale='es', include_context=True):
    url = 'https://evolve2digital.com/api/mcp/tools/agent/query'
    data = {
        'prompt': prompt,
        'locale': locale,
        'includeContext': include_context
    }
    response = requests.post(url, json=data)
    return response.json()
```

## Error Handling

### Common Errors

1. **Rate Limit Exceeded (429)**:
   ```json
   {
     "error": "Rate limit exceeded",
     "message": "Too many requests",
     "retryAfter": 60
   }
   ```

2. **Validation Error (400)**:
   ```json
   {
     "error": "Validation failed",
     "message": "Invalid request data",
     "details": ["Email is required"]
   }
   ```

3. **Not Found (404)**:
   ```json
   {
     "error": "Not found",
     "message": "No posts found matching your query"
   }
   ```

### Best Practices

1. **Respect Rate Limits**: Check rate limit headers and implement backoff
2. **Handle Errors Gracefully**: Always check response status and handle errors
3. **Validate Input**: Ensure data matches expected schemas before sending
4. **Use Appropriate Locales**: Specify correct locale for better search results

## Support

- **Documentation**: See `MCP_SYSTEM_DOCUMENTATION.md` for detailed technical docs
- **Website**: https://evolve2digital.com
- **Contact**: info@evolve2digital.com

---

*Quick Start Guide v1.0.0*
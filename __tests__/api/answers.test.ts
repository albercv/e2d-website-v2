/**
 * @jest-environment node
 */

import { GET, OPTIONS } from '../../app/api/answers/route';
import { NextRequest } from 'next/server';

// Mock Contentlayer data
jest.mock('@/.contentlayer/generated', () => ({
  allPosts: [
    {
      title: 'Desarrollo Web Moderno',
      description: 'Guía completa sobre desarrollo web con tecnologías modernas',
      slug: 'desarrollo-web-moderno',
      locale: 'es',
      tags: ['desarrollo', 'web', 'javascript'],
      author: 'Test Author',
      date: '2024-01-01',
      published: true,
      body: {
        raw: 'Este es un artículo sobre desarrollo web moderno con React, Next.js y otras tecnologías.'
      },
      readingTime: 5,
      cover: '/test-cover.jpg'
    },
    {
      title: 'WhatsApp Automation Guide',
      description: 'Complete guide for WhatsApp automation',
      slug: 'whatsapp-automation',
      locale: 'en',
      tags: ['whatsapp', 'automation', 'bot'],
      author: 'Test Author',
      date: '2024-01-02',
      published: true,
      body: {
        raw: 'This article covers WhatsApp automation techniques and best practices.'
      },
      readingTime: 8,
      cover: '/test-cover-2.jpg'
    }
  ]
}));

describe('/api/answers', () => {
  describe('GET', () => {
    it('should return 400 for missing query parameter', async () => {
       const request = new NextRequest('http://localhost:3000/api/answers');
       const response = await GET(request);
       
       expect(response.status).toBe(400);
       const data = await response.json();
       expect(data.error).toBe('Invalid parameters');
     });

     it('should return 200 with valid response for existing content', async () => {
       const request = new NextRequest('http://localhost:3000/api/answers?query=desarrollo%20web');
       const response = await GET(request);
       
       expect(response.status).toBe(200);
       const data = await response.json();
       
       expect(data).toHaveProperty('query', 'desarrollo web');
       expect(data).toHaveProperty('answer');
       expect(data).toHaveProperty('source');
       expect(data).toHaveProperty('confidence');
       expect(data).toHaveProperty('locale');
       expect(data).toHaveProperty('timestamp');
       expect(data).toHaveProperty('processingTime');
     });

     it('should return 404 for non-existent content', async () => {
       const request = new NextRequest('http://localhost:3000/api/answers?query=nonexistent%20topic');
       const response = await GET(request);
       
       expect(response.status).toBe(404);
       const data = await response.json();
       
       expect(data.answer).toBeNull();
       expect(data.message).toBe('No relevant content found for this query');
       expect(data).toHaveProperty('suggestions');
     });
  });

  describe('OPTIONS', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    });
  });
});
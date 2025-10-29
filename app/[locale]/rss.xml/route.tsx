import { defaultRSSGenerator } from "@/lib/rss-generator"

export async function GET(request: Request, { params }: { params: { locale: string } }) {
  const { locale } = params
  
  try {
    // Generate AI-optimized RSS feed
    const rssContent = defaultRSSGenerator.generateRSSFeed(locale)
    
    return new Response(rssContent, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'X-RSS-Generator': 'E2D RSS Generator v2.0 - AI Optimized',
        'X-Content-Language': locale,
      },
    })
  } catch (error) {
    console.error(`Error generating RSS feed for locale ${locale}:`, error)
    
    // Return error response
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>RSS Feed Error</title>
    <description>Error generating RSS feed</description>
    <link>https://evolve2digital.com/${locale}</link>
  </channel>
</rss>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    )
  }
}

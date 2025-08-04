import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0';

interface FirecrawlSearchParams {
  query: string;
  limit?: number;
  includeImages?: boolean;
  onlyMainContent?: boolean;
}

interface FirecrawlSearchResult {
  title: string;
  url: string;
  content: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    keywords?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Firecrawl API key not configured' },
        { status: 500 }
      );
    }
    
    const body: FirecrawlSearchParams = await request.json();
    
    if (!body.query) {
      return NextResponse.json(
        { success: false, message: 'Search query is required' },
        { status: 400 }
      );
    }
    
    // Use Firecrawl search endpoint
    const searchResponse = await fetch(`${FIRECRAWL_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: body.query,
        pageOptions: {
          includeImages: body.includeImages || false,
          onlyMainContent: body.onlyMainContent || true,
        },
        limit: Math.min(body.limit || 5, 10), // Cap at 10 results
      }),
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Firecrawl API error: ${searchResponse.status} - ${errorText}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Format results
    const results: FirecrawlSearchResult[] = searchData.data?.map((item: any) => ({
      title: item.metadata?.title || item.url,
      url: item.url,
      content: item.content || item.markdown || '',
      markdown: item.markdown,
      metadata: {
        title: item.metadata?.title,
        description: item.metadata?.description,
        language: item.metadata?.language,
        keywords: item.metadata?.keywords,
      }
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        query: body.query,
        results,
        totalResults: results.length,
        searchTime: new Date().toISOString()
      },
      message: 'Search completed successfully'
    });
    
  } catch (error: any) {
    console.error('Firecrawl search error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Search failed'
      },
      { status: 500 }
    );
  }
}

// Alternative endpoint for crawling a specific URL
export async function PUT(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    verifyToken(token);
    
    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Firecrawl API key not configured' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { url, includeImages = false, onlyMainContent = true } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Use Firecrawl scrape endpoint
    const scrapeResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        pageOptions: {
          includeImages,
          onlyMainContent,
        },
      }),
    });
    
    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      throw new Error(`Firecrawl scrape error: ${scrapeResponse.status} - ${errorText}`);
    }
    
    const scrapeData = await scrapeResponse.json();
    
    const result = {
      title: scrapeData.data?.metadata?.title || url,
      url: scrapeData.data?.url || url,
      content: scrapeData.data?.content || '',
      markdown: scrapeData.data?.markdown || '',
      metadata: scrapeData.data?.metadata || {}
    };
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'URL scraped successfully'
    });
    
  } catch (error: any) {
    console.error('Firecrawl scrape error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'URL scraping failed'
      },
      { status: 500 }
    );
  }
}
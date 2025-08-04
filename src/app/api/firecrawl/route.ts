import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v0';

interface FirecrawlRequest {
  action: 'scrape' | 'crawl' | 'search';
  url?: string;
  query?: string;
  options?: {
    formats?: string[];
    onlyMainContent?: boolean;
    includeHtml?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
    waitFor?: number;
    timeout?: number;
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
    
    const user = verifyToken(token);
    
    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Firecrawl API key not configured' },
        { status: 500 }
      );
    }
    
    const body: FirecrawlRequest = await request.json();
    console.log('Firecrawl request:', body);
    
    // Validate required fields
    if (!body.action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }
    
    let firecrawlResponse;
    
    switch (body.action) {
      case 'scrape':
        if (!body.url) {
          return NextResponse.json(
            { success: false, message: 'URL is required for scraping' },
            { status: 400 }
          );
        }
        
        // Validate URL format
        try {
          new URL(body.url);
        } catch (urlError) {
          return NextResponse.json(
            { success: false, message: 'Invalid URL format' },
            { status: 400 }
          );
        }
        
        console.log('Attempting to scrape URL:', body.url);
        
        try {
          firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: body.url,
              formats: body.options?.formats || ['markdown'],
              onlyMainContent: body.options?.onlyMainContent ?? true,
              includeHtml: body.options?.includeHtml ?? false,
              includeTags: body.options?.includeTags || [],
              excludeTags: body.options?.excludeTags || ['nav', 'footer', 'aside', 'script', 'style'],
              waitFor: body.options?.waitFor || 0,
              timeout: body.options?.timeout || 30000
            }),
          });
        } catch (fetchError: any) {
          console.error('Fetch error for scrape:', fetchError);
          throw new Error(`Network error: ${fetchError.message}`);
        }
        break;
        
      case 'crawl':
        if (!body.url) {
          return NextResponse.json(
            { success: false, message: 'URL is required for crawling' },
            { status: 400 }
          );
        }
        
        firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/crawl`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: body.url,
            crawlerOptions: {
              includes: [],
              excludes: [],
              generateImgAltText: true,
              returnOnlyUrls: false,
              maxDepth: 2,
              limit: 100
            },
            pageOptions: {
              onlyMainContent: body.options?.onlyMainContent ?? true,
              includeHtml: body.options?.includeHtml ?? false,
              screenshot: false
            }
          }),
        });
        break;
        
      case 'search':
        if (!body.query) {
          return NextResponse.json(
            { success: false, message: 'Query is required for searching' },
            { status: 400 }
          );
        }
        
        firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: body.query,
            pageOptions: {
              onlyMainContent: true,
              fetchPageContent: true,
              includeHtml: false,
              screenshot: false
            },
            searchOptions: {
              limit: 10
            }
          }),
        });
        break;
        
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Use scrape, crawl, or search' },
          { status: 400 }
        );
    }
    
    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl API error:', firecrawlResponse.status, errorText);
      
      let errorMessage = `Firecrawl API failed with status: ${firecrawlResponse.status}`;
      
      // Provide more specific error messages
      if (firecrawlResponse.status === 401) {
        errorMessage = 'Firecrawl API authentication failed. Please check API key.';
      } else if (firecrawlResponse.status === 403) {
        errorMessage = 'Access forbidden. The website may block scraping or require special permissions.';
      } else if (firecrawlResponse.status === 404) {
        errorMessage = 'URL not found or inaccessible.';
      } else if (firecrawlResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (firecrawlResponse.status >= 500) {
        errorMessage = 'Firecrawl service temporarily unavailable. Please try again later.';
      }
      
      // Try to parse error response for more details
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage += ` Details: ${errorData.error}`;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      throw new Error(errorMessage);
    }
    
    const firecrawlResult = await firecrawlResponse.json();
    console.log('Firecrawl API response received successfully');
    
    return NextResponse.json({
      success: true,
      data: firecrawlResult,
      message: `${body.action} completed successfully`,
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Firecrawl API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to process Firecrawl request'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.cookies.get(COOKIE_OPTIONS.name)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const user = verifyToken(token);
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { success: false, message: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'Firecrawl API key not configured' },
        { status: 500 }
      );
    }
    
    // Simple scrape via GET request
    const firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
        excludeTags: ['nav', 'footer', 'aside']
      }),
    });
    
    if (!firecrawlResponse.ok) {
      throw new Error(`Firecrawl API failed with status: ${firecrawlResponse.status}`);
    }
    
    const result = await firecrawlResponse.json();
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'URL scraped successfully'
    });
    
  } catch (error: any) {
    console.error('Firecrawl GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to scrape URL'
      },
      { status: 500 }
    );
  }
}
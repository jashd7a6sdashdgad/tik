import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

// MCP Server endpoints - these would be configured based on your MCP setup
const MCP_ENDPOINTS = {
  medical: process.env.MCP_MEDICAL_ENDPOINT || 'http://localhost:3001/mcp/medical',
  research: process.env.MCP_RESEARCH_ENDPOINT || 'http://localhost:3001/mcp/research',
  general: process.env.MCP_GENERAL_ENDPOINT || 'http://localhost:3001/mcp/general'
};

interface MCPSearchParams {
  query: string;
  type: 'medical' | 'research' | 'general';
  limit?: number;
  includeReferences?: boolean;
}

interface MCPSearchResult {
  title: string;
  content: string;
  source: string;
  url?: string;
  authors?: string[];
  publishedDate?: string;
  relevanceScore?: number;
  references?: string[];
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
    
    const body: MCPSearchParams = await request.json();
    
    if (!body.query || !body.type) {
      return NextResponse.json(
        { success: false, message: 'Query and type are required' },
        { status: 400 }
      );
    }
    
    const endpoint = MCP_ENDPOINTS[body.type];
    if (!endpoint) {
      return NextResponse.json(
        { success: false, message: 'Invalid search type' },
        { status: 400 }
      );
    }
    
    // Make request to MCP server
    try {
      const mcpResponse = await fetch(`${endpoint}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: body.query,
          limit: Math.min(body.limit || 5, 20),
          includeReferences: body.includeReferences || false
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!mcpResponse.ok) {
        throw new Error(`MCP server error: ${mcpResponse.status}`);
      }
      
      const mcpData = await mcpResponse.json();
      
      // Format results
      const results: MCPSearchResult[] = mcpData.results?.map((item: any) => ({
        title: item.title || 'Untitled',
        content: item.content || item.abstract || '',
        source: item.source || 'Unknown',
        url: item.url,
        authors: item.authors || [],
        publishedDate: item.publishedDate,
        relevanceScore: item.relevanceScore,
        references: item.references || []
      })) || [];
      
      return NextResponse.json({
        success: true,
        data: {
          query: body.query,
          type: body.type,
          results,
          totalResults: mcpData.totalResults || results.length,
          searchTime: new Date().toISOString(),
          source: 'MCP'
        },
        message: 'MCP search completed successfully'
      });
      
    } catch (fetchError: any) {
      // If MCP server is not available, return mock data for demo
      console.warn('MCP server not available, returning mock data:', fetchError.message);
      
      const mockResults: MCPSearchResult[] = [
        {
          title: `Research Results for "${body.query}"`,
          content: `This is a simulated result for your ${body.type} search query. In a real implementation, this would connect to medical literature databases, research repositories, or other specialized knowledge sources through the Model Context Protocol (MCP).`,
          source: 'Mock MCP Server',
          authors: ['Dr. Example', 'Research Team'],
          publishedDate: new Date().toISOString().split('T')[0],
          relevanceScore: 0.95
        },
        {
          title: `Additional ${body.type} findings`,
          content: `Secondary results would appear here with relevant information from authoritative sources. The MCP system enables access to specialized databases and knowledge repositories.`,
          source: 'Mock Database',
          authors: ['Expert Panel'],
          publishedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          relevanceScore: 0.87
        }
      ];
      
      return NextResponse.json({
        success: true,
        data: {
          query: body.query,
          type: body.type,
          results: mockResults,
          totalResults: mockResults.length,
          searchTime: new Date().toISOString(),
          source: 'Mock MCP (Server Unavailable)'
        },
        message: 'Mock MCP search completed (server unavailable)'
      });
    }
    
  } catch (error: any) {
    console.error('MCP search error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'MCP search failed'
      },
      { status: 500 }
    );
  }
}

// Get available MCP tools and their descriptions
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
    
    verifyToken(token);
    
    // Return list of available MCP tools
    const tools = [
      {
        id: 'medical-search',
        name: 'Medical Literature Search',
        description: 'Search through medical journals, research papers, and clinical studies',
        type: 'medical',
        category: 'Research',
        icon: 'stethoscope',
        endpoint: MCP_ENDPOINTS.medical
      },
      {
        id: 'research-search',
        name: 'Academic Research Search',
        description: 'Access academic papers, thesis, and research publications',
        type: 'research',
        category: 'Research',
        icon: 'book-open',
        endpoint: MCP_ENDPOINTS.research
      },
      {
        id: 'general-search',
        name: 'General Knowledge Search',
        description: 'Search through general knowledge bases and encyclopedic sources',
        type: 'general',
        category: 'General',
        icon: 'search',
        endpoint: MCP_ENDPOINTS.general
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: {
        tools,
        totalTools: tools.length,
        categories: ['Research', 'General'],
        githubReference: 'https://github.com/jashd7a6sdashdgad/web-mcp-agent.git'
      },
      message: 'MCP tools retrieved successfully'
    });
    
  } catch (error: any) {
    console.error('MCP tools GET error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to retrieve MCP tools'
      },
      { status: 500 }
    );
  }
}
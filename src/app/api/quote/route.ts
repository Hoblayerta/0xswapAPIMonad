import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Validate required parameters
  if (!searchParams.get('sellToken') || !searchParams.get('buyToken') || !searchParams.get('sellAmount')) {
    return Response.json(
      { error: 'Missing required parameters: sellToken, buyToken, and sellAmount' },
      { status: 400 }
    );
  }
  
  if (!process.env.NEXT_PUBLIC_ZEROEX_API_KEY) {
    return Response.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    const apiUrl = `https://api.0x.org/swap/permit2/quote?${searchParams}`;
    console.log('Quote API request:', apiUrl);

    const res = await fetch(apiUrl, {
      headers: {
        '0x-api-key': process.env.NEXT_PUBLIC_ZEROEX_API_KEY as string,
        '0x-version': 'v2',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout for quotes
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('0x Quote API Error:', res.status, errorText);
      return Response.json(
        { error: `0x Quote API Error: ${res.status} - ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log('Quote data received:', data);

    return Response.json(data);
  } catch (error: any) {
    console.error('Quote API error:', error);
    
    if (error.name === 'TimeoutError') {
      return Response.json(
        { error: 'Quote request timeout - please try again' },
        { status: 408 }
      );
    }
    
    return Response.json(
      { error: error.message || 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}
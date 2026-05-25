import { NextResponse } from 'next/server';

// Store opens in memory
const opens: Record<string, { count: number; firstOpened: string; lastOpened: string }> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const id = searchParams.get('id');

  console.log('🔍 Tracking pixel requested!');
  console.log('   Email:', email);
  console.log('   ID:', id);

  if (email && id) {
    if (!opens[email]) {
      opens[email] = {
        count: 0,
        firstOpened: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
      };
    }
    opens[email].count++;
    opens[email].lastOpened = new Date().toISOString();
    
    console.log(`📬 Email opened by ${email} (${opens[email].count} times)`);
    console.log(`   First opened: ${opens[email].firstOpened}`);
    console.log(`   Last opened: ${opens[email].lastOpened}`);
  } else {
    console.log('⚠️ Missing email or id parameter');
  }

  // Return a 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

export async function POST(request: Request) {
  const { email } = await request.json();
  return NextResponse.json({ opens: opens[email] || { count: 0 } });
}
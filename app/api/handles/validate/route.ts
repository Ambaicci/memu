import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
  try {
    const { handle } = await request.json();
    
    if (!handle) {
      return NextResponse.json({ valid: false, error: 'Handle is required' }, { status: 400 });
    }

    // Clean the handle (remove @ if they typed it)
    const cleanHandle = handle.replace('@', '').trim().toLowerCase();

    // Search the profiles table for this exact username
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('username', cleanHandle)
      .single();

    if (error || !data) {
      // Handle does not exist in the database
      return NextResponse.json({ 
        valid: false, 
        message: `@${cleanHandle} is not a valid Memu handle.` 
      }, { status: 200 }); // Return 200 so the UI can show the friendly message
    }

    // Handle exists!
    return NextResponse.json({ 
      valid: true, 
      user: {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        avatar_url: data.avatar_url
      }
    }, { status: 200 });

  } catch (err) {
    console.error('Validate handle error:', err);
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}
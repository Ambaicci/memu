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
    const { email, password, fullName, username, avatarUrl } = await request.json();

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | null = null;

    if (!listError && existingUsers) {
      const existing = existingUsers.users.find(u => u.email === email);
      if (existing) {
        userId = existing.id;
      }
    }

    // If user doesn't exist, create them
    if (!userId) {
      const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username },
      });

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }
      userId = authData.user.id;
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          username,
          full_name: fullName,
          avatar_url: avatarUrl,
        });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ user: { id: userId } }, { status: 200 });
  } catch (err) {
    console.error('Signup API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
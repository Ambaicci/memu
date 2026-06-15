import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { fullName } = await request.json();
    if (!fullName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    // Clean the name and generate variations with the .memu suffix
    const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const variations = [
      `${base}.memu`,
      `${base}${Math.floor(Math.random() * 99)}.memu`,
      `${base.substring(0, 5)}${Math.floor(Math.random() * 999)}.memu`
    ];
    
    // Remove duplicates
    const uniqueVars = Array.from(new Set(variations)).slice(0, 3);
    while(uniqueVars.length < 3) {
        uniqueVars.push(`${base}${Math.floor(Math.random() * 9999)}.memu`);
    }

    // Check which ones are already taken in the database
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .in('username', uniqueVars);

    const takenUsernames = new Set(existingProfiles?.map(p => p.username) || []);
    const availableHandles = uniqueVars.filter(v => !takenUsernames.has(v));

    // Fallback if somehow all are taken
    while (availableHandles.length < 3) {
        const newVar = `${base}${Math.floor(Math.random() * 99999)}.memu`;
        if (!takenUsernames.has(newVar)) {
            availableHandles.push(newVar);
            takenUsernames.add(newVar);
        }
    }

    return NextResponse.json({ handles: availableHandles.slice(0, 3) }, { status: 200 });
  } catch (err) {
    console.error('Suggest handles error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
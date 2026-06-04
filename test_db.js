const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  // Try to get table info by selecting one row
  const { data: memus, error: memusError } = await supabase
    .from('memus')
    .select('*')
    .limit(1);
  
  if (memusError) {
    console.error('Error fetching memus:', memusError.message);
  } else {
    console.log('memus table exists. Sample columns:', memus.length ? Object.keys(memus[0]) : 'no rows');
  }

  // Check profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError.message);
  } else {
    console.log('profiles table exists. Sample columns:', profiles.length ? Object.keys(profiles[0]) : 'no rows');
  }
}

checkSchema();
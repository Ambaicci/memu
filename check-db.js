const { supabase } = require('./lib/supabase');

async function check() {
  console.log('Checking memus table...');
  const { data: memus, error: memusError } = await supabase.from('memus').select('*').limit(1);
  if (memusError) {
    console.log('memus error:', memusError.message);
  } else {
    console.log('memus sample:', memus);
  }

  console.log('\nChecking profiles table...');
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').limit(1);
  if (profilesError) {
    console.log('profiles error:', profilesError.message);
  } else {
    console.log('profiles sample:', profiles);
  }
}

check();
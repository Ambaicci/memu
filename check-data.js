const { supabase } = require('./lib/supabase');
async function fetchData() {
  const { data: profiles, error: pe } = await supabase.from('profiles').select('id, username, full_name');
  if (pe) console.error('Profiles error:', pe);
  else console.log('Profiles:', JSON.stringify(profiles, null, 2));
  
  const { data: memus, error: me } = await supabase.from('memus').select('id, sender_id, recipient_id, subject, status').limit(5);
  if (me) console.error('Memus error:', me);
  else console.log('Memus:', JSON.stringify(memus, null, 2));
}
fetchData();

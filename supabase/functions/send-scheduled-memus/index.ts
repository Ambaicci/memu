import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date().toISOString();

  // Fetch memus scheduled to be sent
  const { data: memus, error } = await supabase
    .from('memus')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(100);

  if (error) {
    console.error('Error fetching scheduled memus:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const memu of memus || []) {
    // Update status to 'sent'
    const { error: updateError } = await supabase
      .from('memus')
      .update({ status: 'sent', delivered_at: now })
      .eq('id', memu.id);
    if (updateError) {
      console.error(`Failed to send memu ${memu.id}:`, updateError);
      continue;
    }

    // If recipient is a handle and exists, attempt email notification (optional)
    if (memu.recipient_email && memu.recipient_email.includes('@') && !memu.recipient_email.endsWith('.memu')) {
      // You can call your email API here
      try {
        await fetch(`${Deno.env.get('APP_URL')}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: memu.recipient_email,
            subject: memu.subject,
            body: { text: memu.body, nature: memu.nature },
          }),
        });
      } catch (emailErr) {
        console.error(`Email failed for ${memu.id}:`, emailErr);
      }
    }
    sent++;
  }

  return new Response(JSON.stringify({ success: true, sent }), { status: 200 });
});
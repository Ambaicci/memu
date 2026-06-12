import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Fetch due scheduled memus
  const { data: memus, error } = await supabase
    .from('memus')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const memu of memus || []) {
    // Update status to 'sent'
    const { error: updateError } = await supabase
      .from('memus')
      .update({ status: 'sent', delivered_at: now })
      .eq('id', memu.id);
    if (updateError) continue;

    // Optional: send email notification to recipient if external email
    if (memu.recipient_email && memu.recipient_email.includes('@') && !memu.recipient_email.endsWith('.memu')) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: memu.recipient_email,
            subject: memu.subject,
            body: { text: memu.body, nature: memu.nature },
          }),
        });
      } catch (emailErr) {
        console.error(`Email failed for ${memu.id}`);
      }
    }
    sent++;
  }

  return NextResponse.json({ success: true, sent });
}
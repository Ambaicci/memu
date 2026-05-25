import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, subject, body, fromName, fromHandle } = await request.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get base URL for tracking pixel (works locally and in production)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const trackingId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Send real email via Resend
    const { data, error } = await resend.emails.send({
      from: `memu <onboarding@resend.dev>`,
      to: [to],
      subject: `📬 ${fromName} (${fromHandle}) sent you a memu: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4f46e5, #0891b2); color: white; padding: 30px; text-align: center; border-radius: 16px 16px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e8e7e3; border-top: none; border-radius: 0 0 16px 16px; }
            .memu-meta { background: #f5f5f0; padding: 15px; border-radius: 12px; margin: 20px 0; font-size: 14px; }
            .handle { color: #4f46e5; font-weight: 500; }
            .memu-body { background: #fafaf8; padding: 20px; border-radius: 12px; margin: 20px 0; white-space: pre-wrap; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <!-- Tracking pixel -->
          <img src="${baseUrl}/api/track-open?email=${to}&id=${trackingId}" width="1" height="1" style="display:none;" />
          
          <div class="header">
            <h1 style="margin: 0;">📬 memu</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">communicate differently</p>
          </div>
          <div class="content">
            <p><strong>${fromName}</strong> (<span class="handle">${fromHandle}</span>) sent you a memu:</p>
            
            <div class="memu-meta">
              <strong>Subject:</strong> ${subject}<br>
              <strong>Nature:</strong> ${body.nature || 'General'}
            </div>
            
            <div class="memu-body">
              ${body.text.replace(/\n/g, '<br>')}
            </div>
            
            <p style="margin-top: 20px;">
              <a href="https://memu.app" style="display: inline-block; background: #1a1a1a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 30px;">Reply on memu →</a>
            </p>
            
            <div class="footer">
              <p>You're receiving this because ${fromName} sent you a memu.</p>
              <p>Get memu → <a href="https://memu.app" style="color: #4f46e5;">https://memu.app</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Email sent successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
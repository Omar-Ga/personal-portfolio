import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY environment variable is missing.');
      return NextResponse.json(
        { error: 'Server email service is not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    const { name, email, message } = body as {
      name?: string;
      email?: string;
      message?: string;
    };

    const trimmedName = (name ?? '').trim();
    const trimmedEmail = (email ?? '').trim();
    const trimmedMessage = (message ?? '').trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    // 1. Send notification to Omar
    const notification = await resend.emails.send({
      from: 'Omar Gamal Portfolio <contact@omargamal.studio>',
      to: 'oomarolayan.gamal@gmail.com',
      replyTo: trimmedEmail,
      subject: `[Portfolio Inquiry] from ${trimmedName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #fafafa;">
          <h2 style="color: #111; margin-top: 0; font-size: 20px;">New Message from Portfolio</h2>
          <div style="background-color: #fff; padding: 16px; border-radius: 6px; border: 1px solid #e0e0e0; margin-bottom: 20px;">
            <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(trimmedEmail)}">${escapeHtml(trimmedEmail)}</a></p>
          </div>
          <div style="background-color: #fff; padding: 16px; border-radius: 6px; border: 1px solid #e0e0e0;">
            <h4 style="margin: 0 0 8px 0; color: #555; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Message</h4>
            <p style="margin: 0; white-space: pre-wrap; color: #222; line-height: 1.6;">${escapeHtml(trimmedMessage)}</p>
          </div>
          <p style="font-size: 12px; color: #888; margin-top: 24px; text-align: center;">Sent via omargamal.studio contact form</p>
        </div>
      `,
      text: `New Message from Portfolio\n\nName: ${trimmedName}\nEmail: ${trimmedEmail}\n\nMessage:\n${trimmedMessage}`
    });

    if (notification.error) {
      console.error('Resend notification error:', notification.error);
      return NextResponse.json(
        { error: notification.error.message },
        { status: 500 }
      );
    }

    // 2. Send friendly confirmation receipt to visitor
    try {
      await resend.emails.send({
        from: 'Omar Gamal <contact@omargamal.studio>',
        to: trimmedEmail,
        subject: `Thank you for reaching out, ${trimmedName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #111;">
            <h2 style="font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Hello ${escapeHtml(trimmedName)},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              Thank you for getting in touch. I have received your message and will review it and reply as soon as possible.
            </p>
            <div style="background-color: #f7f7f7; padding: 16px 20px; border-left: 3px solid #111; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
              <p style="margin: 0; font-size: 14px; color: #555; white-space: pre-wrap; font-style: italic;">"${escapeHtml(trimmedMessage)}"</p>
            </div>
            <p style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 8px;">
              Best regards,<br />
              <strong>Omar Gamal</strong><br />
              <a href="https://omargamal.studio" style="color: #0066cc; text-decoration: none;">omargamal.studio</a>
            </p>
          </div>
        `,
        text: `Hello ${trimmedName},\n\nThank you for getting in touch. I have received your message and will review it and reply as soon as possible.\n\nYour message:\n"${trimmedMessage}"\n\nBest regards,\nOmar Gamal\nhttps://omargamal.studio`
      });
    } catch (confErr) {
      // Non-blocking if confirmation fails (e.g. rate limit or bad recipient MX)
      console.warn('Failed to send confirmation email to visitor:', confErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Contact submission error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

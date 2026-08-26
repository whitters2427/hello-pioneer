const { supabaseAdmin } = require("../lib/supabase-admin");

const SITE_URL = "https://hello-pioneer-sepia.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { to, text, createdAt, noteId } = req.body || {};

  if (typeof to !== "string" || !EMAIL_RE.test(to)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Missing note text" });
    return;
  }
  if (typeof noteId !== "string" || !noteId) {
    res.status(400).json({ error: "Missing note id" });
    return;
  }

  const formattedDate = createdAt ? new Date(createdAt).toLocaleString() : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafc;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <p style="font-size: 13px; color: #64748b; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">A note from Pioneer Species</p>
        <p style="font-size: 17px; color: #0f172a; line-height: 1.5; margin: 0 0 16px; white-space: pre-wrap;">${escapeHtml(text)}</p>
        ${formattedDate ? `<p style="font-size: 13px; color: #94a3b8; margin: 0 0 24px;">${escapeHtml(formattedDate)}</p>` : ""}
        <a href="${SITE_URL}" style="display: inline-block; background: #38bdf8; color: #0f172a; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 8px; font-size: 14px;">View all notes</a>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pioneer Species Notes <onboarding@resend.dev>",
        to: [to],
        subject: "A note was shared with you",
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(502).json({ error: "Resend rejected the email", detail });
      return;
    }

    const sent = await response.json();

    await supabaseAdmin("email_shares", {
      method: "POST",
      body: JSON.stringify({
        note_id: noteId,
        resend_email_id: sent.id,
        recipient: to,
        status: "sent",
      }),
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email" });
  }
};

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

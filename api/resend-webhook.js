const crypto = require("crypto");
const { supabaseAdmin } = require("../lib/supabase-admin");

const STATUS_BY_EVENT = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const rawBody = await readRawBody(req);

  const valid = verifySignature(
    process.env.RESEND_WEBHOOK_SECRET,
    req.headers["svix-id"],
    req.headers["svix-timestamp"],
    req.headers["svix-signature"],
    rawBody
  );

  if (!valid) {
    res.status(401).send("Invalid signature");
    return;
  }

  const event = JSON.parse(rawBody);
  const status = STATUS_BY_EVENT[event.type];
  const emailId = event.data && event.data.email_id;

  if (status && emailId) {
    await supabaseAdmin(`email_shares?resend_email_id=eq.${encodeURIComponent(emailId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });
  }

  res.status(200).json({ ok: true });
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function verifySignature(secret, svixId, svixTimestamp, svixSignature, body) {
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;

  const timestampSeconds = Number(svixTimestamp);
  if (!timestampSeconds || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected);

  return svixSignature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean)
    .some((sig) => {
      const sigBuf = Buffer.from(sig);
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    });
}

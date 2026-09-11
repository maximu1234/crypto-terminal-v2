const {
  verifySiteGateToken,
  signTradeToken
} = require("./_token.js");

function readCookie(header, name) {
  const raw = String(header || "");
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      return rest.join("=");
    }
  }
  return "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }
  const secret = String(process.env.SITE_GATE_SECRET || "").trim();
  const token = readCookie(req.headers.cookie, "mc_site_gate");
  const session = secret ? verifySiteGateToken(secret, token) : null;
  if (!session || session.typ === "trade") {
    res.status(401).json({ ok: false });
    return;
  }
  const tradeToken = signTradeToken(secret, session.email);
  res.status(200).json({
    ok: true,
    tradeToken,
    email: session.email
  });
};

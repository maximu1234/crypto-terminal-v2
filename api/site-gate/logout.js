module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const proto = String(
    req.headers["x-forwarded-proto"] || ""
  ).split(",")[0].trim();
  const secure = proto === "https" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `mc_site_gate=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
  if (req.method === "POST") {
    res.status(200).json({ ok: true });
    return;
  }
  res.statusCode = 302;
  res.setHeader("Location", "/login");
  res.end();
};

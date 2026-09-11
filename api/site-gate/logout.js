function clearCookieHeader(secure) {
  const parts = [
    "mc_site_gate=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function isSecure(req) {
  const proto = String(
    req.headers["x-forwarded-proto"] || ""
  ).split(",")[0].trim();
  return proto === "https";
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", clearCookieHeader(isSecure(req)));
  if (req.method === "POST") {
    res.status(200).json({ ok: true });
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/><title>Выход</title></head><body><script>
try {
  sessionStorage.removeItem("mc_trade_token_v1");
  sessionStorage.removeItem("mc_trade_token_v2");
} catch (e) {}
location.replace("/login");
</script></body></html>`);
};

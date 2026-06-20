import { readEnv } from "./config.js";
import { verifyUserFromRequest } from "./client-http.js";

function normalizeEmail(raw) {

  return String(raw || "").trim().toLowerCase();

}

export function getSystemAdminEmails() {

  const raw =
    readEnv("SYSTEM_ADMIN_EMAIL");

  if (!raw) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(/[,;]/)
        .map(normalizeEmail)
        .filter(Boolean)
    )
  ];

}

export function isSystemAdminEmail(email) {

  const norm =
    normalizeEmail(email);

  if (!norm) {
    return false;
  }

  return getSystemAdminEmails().includes(norm);

}

/**
 * JWT пользователя + email в SYSTEM_ADMIN_EMAIL (Railway / Vercel).
 */
export async function verifySystemAdminFromRequest(req) {

  const user =
    await verifyUserFromRequest(req);

  if (
    !user?.email ||
    !isSystemAdminEmail(user.email)
  ) {
    return null;
  }

  return user;

}

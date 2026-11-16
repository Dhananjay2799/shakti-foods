import crypto from "crypto";

/*
 * Small signed codes for links in emails (review links, unsubscribe).
 * The payload is readable but can't be changed or forged without the
 * server secret. Each purpose has its own key, so a code made for one
 * link can't be used for another.
 */

function keyFor(purpose) {
  const secret = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

  if (!secret) {
    throw new Error("Signing secret is not configured.");
  }

  return crypto.createHash("sha256").update(`signed-link|${purpose}|${secret}`).digest();
}

function sign(purpose, body) {
  return crypto.createHmac("sha256", keyFor(purpose)).update(body).digest("base64url");
}

/** payload: a small plain object. expiresInDays: optional. */
export function createSignedToken(purpose, payload, { expiresInDays } = {}) {
  const data = { ...payload };

  if (expiresInDays) {
    data.x = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  }

  const body = Buffer.from(JSON.stringify(data)).toString("base64url");

  return `${body}.${sign(purpose, body)}`;
}

/** The payload, or null if the code is missing, changed or expired. */
export function readSignedToken(purpose, token) {
  const [body, signature] = String(token || "").split(".");

  if (!body || !signature) {
    return null;
  }

  let expected;

  try {
    expected = Buffer.from(sign(purpose, body));
  } catch {
    return null;
  }

  const given = Buffer.from(signature);

  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

    if (data.x && Number(data.x) < Date.now()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

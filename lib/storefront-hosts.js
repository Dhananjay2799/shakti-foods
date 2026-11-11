/*
 * Hostnames that serve the Simpli Ecoware website. Every other hostname
 * (shaktifoodsus.com, previews, localhost) is Shakti Foods.
 *
 * Keep this list in sync with ECOWARE_HOSTS in middleware.js.
 */
export const ECOWARE_HOSTNAMES = [
  "simpliecoware.vercel.app",
  "www.simpliecoware.com",
  "simpliecoware.com"
];

const ECOWARE_HOSTNAME_SET = new Set(ECOWARE_HOSTNAMES);

/*
 * Shakti Foods' one public address. The older shakti-foods.com addresses
 * forward here (see middleware.js), so search engines list a single site.
 */
export const SHAKTI_PRIMARY_HOSTNAME = "shaktifoodsus.com";
export const SHAKTI_PRIMARY_URL = `https://${SHAKTI_PRIMARY_HOSTNAME}`;

export const SHAKTI_LEGACY_HOSTNAMES = [
  "shakti-foods.com",
  "www.shakti-foods.com"
];

const SHAKTI_LEGACY_HOSTNAME_SET = new Set(SHAKTI_LEGACY_HOSTNAMES);

// Still answered on the old addresses: webhooks and other server-to-server
// callbacks may be registered there, and they do not follow redirects.
const LEGACY_HOST_PASSTHROUGH_PREFIXES = ["/api"];

function normalizeHostname(hostHeader) {
  return String(hostHeader || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
}

/**
 * Returns the normalized Ecoware hostname for a Host header value, or null
 * when the request is not for the Ecoware website. Because only allow-listed
 * names are returned, the result is safe to build absolute URLs from.
 */
export function getEcowareHostname(hostHeader) {
  const hostname = normalizeHostname(hostHeader);

  return ECOWARE_HOSTNAME_SET.has(hostname) ? hostname : null;
}

/**
 * For a request to an old shakti-foods.com address, the same page on
 * shaktifoodsus.com. Null when the request should be served as it is.
 */
export function getShaktiLegacyRedirectUrl({
  hostHeader,
  pathname = "/",
  search = ""
}) {
  if (!SHAKTI_LEGACY_HOSTNAME_SET.has(normalizeHostname(hostHeader))) {
    return null;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const isPassthrough = LEGACY_HOST_PASSTHROUGH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (isPassthrough) {
    return null;
  }

  return `${SHAKTI_PRIMARY_URL}${path}${search || ""}`;
}

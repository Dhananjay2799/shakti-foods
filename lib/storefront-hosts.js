/*
 * Hostnames that serve the Simpli Ecoware website. Every other hostname
 * (shakti-foods.com, shaktifoodsus.com, previews, localhost) is Shakti Foods.
 *
 * Keep this list in sync with ECOWARE_HOSTS in middleware.js.
 */
export const ECOWARE_HOSTNAMES = [
  "simpliecoware.vercel.app",
  "www.simpliecoware.com",
  "simpliecoware.com"
];

const ECOWARE_HOSTNAME_SET = new Set(ECOWARE_HOSTNAMES);

/**
 * Returns the normalized Ecoware hostname for a Host header value, or null
 * when the request is not for the Ecoware website. Because only allow-listed
 * names are returned, the result is safe to build absolute URLs from.
 */
export function getEcowareHostname(hostHeader) {
  const hostname = String(hostHeader || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();

  return ECOWARE_HOSTNAME_SET.has(hostname) ? hostname : null;
}

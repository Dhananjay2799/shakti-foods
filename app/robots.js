import { headers } from "next/headers";
import { site } from "@/lib/site";
import { getEcowareHostname } from "@/lib/storefront-hosts";

export default function robots() {
  // Simpli Ecoware points crawlers at its own sitemap; Shakti Foods is unchanged.
  const ecowareHostname = getEcowareHostname(headers().get("host"));

  if (ecowareHostname) {
    return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: `https://${ecowareHostname}/sitemap.xml`
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.baseUrl}/sitemap.xml`
  };
}

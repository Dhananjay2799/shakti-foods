export const site = {
  name: "Shakti Foods",
  legalName: "United 5 Investment",
  tagline: "Power of Purity",
  phone: "+1 728-777-3374",
  phoneRaw: "+17287773374",
  email: "Info@united5investment.com",
  address: "Weston, Florida",
  hours: "7:00 AM to 10:00 PM",
  // Same number as the phone; wa.me needs digits only.
  whatsappNumber: "17287773374",
  whatsappMessage: "Hello, I want information about Shakti Foods products.",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
};

export function whatsappLink(message = site.whatsappMessage) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(subject = "Shakti Foods Inquiry", body = "") {
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

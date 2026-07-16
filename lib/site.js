export const site = {
  name: "Shakti Foods",
  legalName: "United 5 Investment",
  tagline: "Power of Purity",
  phone: "+1 (973) 262-0717",
  phoneRaw: "19732620717",
  email: "Info@united5investment.com",
  address: "Weston, Florida",
  hours: "9:00 AM to 5:00 PM",
  whatsappNumber: "19732620717",
  whatsappMessage: "Hello, I want information about Shakti Foods products.",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
};

export function whatsappLink(message = site.whatsappMessage) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(subject = "Shakti Foods Inquiry", body = "") {
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

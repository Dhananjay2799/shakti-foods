import { commerce } from "@/lib/commerce";
import { site } from "@/lib/site";

/*
 * Customer policy pages (Shipping, Returns, FAQ, Privacy, Terms) for both
 * stores. The facts come from the business owner (Nov 12, 2026) and from
 * the store's own settings:
 *   - Ships to US addresses only (checkout only accepts US addresses).
 *   - Orders ship within 3 business days.
 *   - Shipping: flat rate, free above the threshold in lib/commerce.js.
 *   - Returns: within 4 days of delivery; the store pays return shipping.
 *   - Damaged / wrong items: the customer chooses a replacement or refund.
 *   - Help: the website phone number and the support email below.
 *
 * Paragraphs are strings or arrays of strings and links. A link's href may
 * be "page:<id>" (another policy page) or "path:/x" (a page on the same
 * store); both get the store's path prefix.
 */

export const POLICY_LAST_UPDATED = "November 12, 2026";

export { POLICY_NAV } from "@/lib/policy-nav";

const RETURN_DAYS = 4;
const SHIP_WITHIN_BUSINESS_DAYS = 3;

function money(amount) {
  const value = Number(amount || 0);
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function link(href, label) {
  return { href, label };
}

export function getPolicyContact() {
  return {
    phone: site.phone,
    phoneRaw: site.phoneRaw,
    whatsappNumber: site.whatsappNumber,
    email: site.supportEmail,
    hours: `${site.hours} (Eastern Time), every day`,
    operator: site.legalName,
    location: site.address
  };
}

function storeFacts(storefront) {
  const ecoware = storefront === "ecoware";

  return {
    ecoware,
    brand: ecoware ? "Simpli Ecoware" : "Shakti Foods",
    other: ecoware ? "Shakti Foods" : "Simpli Ecoware",
    products: ecoware
      ? "compostable plates, bowls, trays and food-service packaging"
      : "premium Basmati rice",
    shipping: money(commerce.standardShipping),
    freeOver: money(commerce.freeShippingThreshold),
    returnCondition: ecoware
      ? "unused, in the original packaging, with the pack unopened"
      : "unopened and sealed, in the original packaging",
    returnConditionWhy: ecoware
      ? "Opened or used tableware can't be resold, so we can only accept unopened packs."
      : "Rice is a food product, so for food safety we can only accept bags that are still sealed."
  };
}

/* ------------------------------------------------------------------ */

function shippingPage(f, c) {
  return {
    title: "Shipping Policy",
    description: `Where ${f.brand} ships, how much shipping costs, and when your order leaves our warehouse.`,
    intro: `Here's how ${f.brand} orders are shipped, what shipping costs, and how to follow your package.`,
    sections: [
      {
        id: "where",
        title: "Where we ship",
        body: [
          "We ship to addresses in the United States. Checkout only accepts US shipping addresses, and we can't ship to other countries at this time."
        ]
      },
      {
        id: "when",
        title: "When your order ships",
        body: [
          `We ship orders within ${SHIP_WITHIN_BUSINESS_DAYS} business days of the day you place them. Business days are Monday to Friday, not counting US federal holidays.`,
          "Delivery time after that depends on the carrier and your address."
        ]
      },
      {
        id: "cost",
        title: "Shipping cost",
        body: [
          {
            list: [
              `Orders of ${f.freeOver} or more (before tax): free shipping.`,
              `Orders under ${f.freeOver}: ${f.shipping} flat rate.`
            ]
          },
          "You'll see the shipping charge before you pay. Sales tax, where it applies, is worked out at checkout from your delivery address."
        ]
      },
      {
        id: "tracking",
        title: "Tracking your order",
        body: [
          "When your order ships, we email you the carrier and tracking number at the address you gave at checkout. If you haven't heard from us within 3 business days, please contact us."
        ]
      },
      {
        id: "bulk",
        title: "Wholesale and large orders",
        body: [
          [
            "Very large or pallet-sized orders may ship by freight. We'll confirm the shipping cost and timing with you first, usually as part of a ",
            link(f.ecoware ? "path:/wholesale/quote" : "path:/contact?type=wholesale", "wholesale quote"),
            "."
          ]
        ]
      },
      {
        id: "problems",
        title: "Delivery problems",
        body: [
          [
            `If your package arrives damaged, or tracking says it was delivered but you can't find it, contact us within ${RETURN_DAYS} days of delivery. See our `,
            link("page:returns", "Returns & Refunds policy"),
            " for how we fix damaged or wrong items."
          ]
        ]
      }
    ]
  };
}

function returnsPage(f, c) {
  return {
    title: "Returns & Refunds",
    description: `${f.brand} accepts returns within ${RETURN_DAYS} days of delivery, and we pay for return shipping.`,
    intro: `We want you to be happy with your order. If something isn't right, here's how returns, refunds and damaged orders work.`,
    sections: [
      {
        id: "window",
        title: `Returns within ${RETURN_DAYS} days`,
        body: [
          `You can ask to return an order within ${RETURN_DAYS} days of delivery. To be returned, items must be ${f.returnCondition}. ${f.returnConditionWhy}`
        ]
      },
      {
        id: "how",
        title: "How to start a return",
        body: [
          {
            list: [
              `Contact us within ${RETURN_DAYS} days of delivery by email or phone (details below), with your order number and the items you want to return.`,
              "We'll confirm the return and send you a prepaid return shipping label.",
              "Pack the items securely and send them back with that label."
            ]
          }
        ]
      },
      {
        id: "shipping-cost",
        title: "Return shipping is on us",
        body: [
          "We pay for return shipping when you use the label we send you. Please don't send returns without contacting us first, because we can't match packages to orders without a return label.",
          "For returns that aren't because of damage or a mistake on our part, the original shipping charge isn't refunded."
        ]
      },
      {
        id: "damaged",
        title: "Damaged, defective or wrong items",
        body: [
          `If an item arrives damaged or defective, or we sent the wrong item, contact us within ${RETURN_DAYS} days of delivery. Please include photos of the item and the packaging.`,
          "You choose what happens next:",
          {
            list: [
              "A replacement, shipped at no cost to you, or",
              "A full refund for the affected items, including what you paid for shipping."
            ]
          },
          "We may ask you to send the item back. If we do, we'll send a prepaid label."
        ]
      },
      {
        id: "refunds",
        title: "Refunds",
        body: [
          "Refunds go back to the original payment method. We issue a refund once we receive and check the return, or as soon as we confirm a damaged or wrong item.",
          "Card refunds usually appear in 5 to 10 business days, depending on your bank. PayPal refunds go back to your PayPal account."
        ]
      },
      {
        id: "exceptions",
        title: "Items we can't take back",
        body: [
          {
            list: [
              `Items that aren't ${f.returnCondition}, unless they arrived damaged or wrong.`,
              `Return requests made more than ${RETURN_DAYS} days after delivery.`,
              ...(f.ecoware ? ["Free sample packs."] : []),
              "Wholesale orders placed through a quote follow the terms on that quote."
            ]
          }
        ]
      },
      {
        id: "subscriptions",
        title: "Subscribe & Save orders",
        body: [
          "Each Subscribe & Save delivery is covered by this policy the same way as any other order. To skip, change or cancel future deliveries, contact us before your next order date."
        ]
      }
    ]
  };
}

function faqPage(f, c) {
  const items = [
    {
      id: "where-ship",
      title: "Where do you ship?",
      body: ["We ship to addresses in the United States."]
    },
    {
      id: "shipping-cost",
      title: "How much is shipping?",
      body: [
        `Shipping is free on orders of ${f.freeOver} or more (before tax). Orders under ${f.freeOver} pay a ${f.shipping} flat rate.`
      ]
    },
    {
      id: "when-ship",
      title: "When will my order ship?",
      body: [
        [
          `We ship orders within ${SHIP_WITHIN_BUSINESS_DAYS} business days and email you a tracking number when they leave. See our `,
          link("page:shipping", "Shipping Policy"),
          " for details."
        ]
      ]
    },
    {
      id: "payment",
      title: "How can I pay?",
      body: [
        "You can pay with a major credit or debit card through our secure Stripe checkout. When PayPal is available, you'll see it as an option at checkout. We never see or store your full card number."
      ]
    },
    {
      id: "tax",
      title: "Do you charge sales tax?",
      body: [
        "Sales tax, where it applies, is worked out at checkout from your delivery address."
      ]
    },
    {
      id: "returns",
      title: "Can I return my order?",
      body: [
        [
          `Yes. You can return items within ${RETURN_DAYS} days of delivery if they're ${f.returnCondition}, and we pay for return shipping. See `,
          link("page:returns", "Returns & Refunds"),
          "."
        ]
      ]
    },
    {
      id: "damaged",
      title: "My order arrived damaged. What now?",
      body: [
        `Contact us within ${RETURN_DAYS} days of delivery with photos of the item and the packaging. You choose a free replacement or a full refund.`
      ]
    },
    {
      id: "subscribe",
      title: "What is Subscribe & Save?",
      body: [
        "On products that offer it, Subscribe & Save delivers your order on a regular schedule at the discount shown on the product page. You're charged for each delivery on its order date. To skip, change or cancel, contact us before your next order date."
      ]
    }
  ];

  if (f.ecoware) {
    items.push(
      {
        id: "samples",
        title: "Can I try your products before ordering in bulk?",
        body: [
          [
            "Yes. Businesses can ",
            link("path:/sample-requests", "request free samples"),
            " to check quality, size and performance before placing a larger order."
          ]
        ]
      },
      {
        id: "wholesale",
        title: "Do you offer wholesale pricing?",
        body: [
          [
            "Yes. Quantity pricing is shown on product pages where it's available, and you can ",
            link("path:/wholesale/quote", "request a wholesale quote"),
            " for larger or regular orders."
          ]
        ]
      },
      {
        id: "compostable",
        title: "Are your products compostable?",
        body: [
          [
            "Our products are made from sugarcane bagasse, a plant fiber. Product pages list certifications where they apply. How well items break down depends on your local composting facility, so please check with your local program. Learn more on our ",
            link("path:/sustainability", "Sustainability page"),
            "."
          ]
        ]
      }
    );
  } else {
    items.push({
      id: "wholesale",
      title: "Do you sell in bulk or wholesale?",
      body: [
        [
          "Yes. Quantity pricing is shown on product pages where it's available, and restaurants, caterers and stores can ",
          link("path:/contact?type=wholesale", "send a wholesale inquiry"),
          " for larger or regular orders."
        ]
      ]
    });
  }

  items.push({
    id: "contact",
    title: "How do I reach you?",
    body: [
      `Call or WhatsApp ${c.phone}, ${c.hours}, or email ${c.email}.`
    ]
  });

  return {
    title: "Frequently Asked Questions",
    navLabel: "FAQ",
    description: `Answers about ${f.brand} shipping, payments, returns, Subscribe & Save and wholesale orders.`,
    intro: "Quick answers to the questions we hear most. Can't find yours? Contact us. We're happy to help.",
    sections: items
  };
}

function privacyPage(f, c) {
  return {
    title: "Privacy Policy",
    description: `How ${f.brand} collects, uses and protects your personal information.`,
    intro: `This policy explains what information ${f.brand} collects when you visit our website or buy from us, how we use it, and the choices you have.`,
    sections: [
      {
        id: "who",
        title: "Who we are",
        body: [
          `${f.brand} and ${f.other} are brands of ${c.operator}, based in ${c.location}. In this policy, "we", "us" and "our" mean ${c.operator}.`
        ]
      },
      {
        id: "collect",
        title: "Information we collect",
        body: [
          "Information you give us:",
          {
            list: [
              "Your name, email address, phone number, and shipping and billing addresses when you order.",
              "What you ordered, Subscribe & Save choices, and messages you send us.",
              ...(f.ecoware
                ? ["Business details you share when you request free samples or a wholesale quote, such as your business name, type and expected quantities."]
                : ["Business details you share in a wholesale inquiry, such as your business name, type and expected quantities."]),
              "Product reviews you submit."
            ]
          },
          "Information collected automatically:",
          {
            list: [
              "Your cart, which is saved in your browser so it's still there when you come back.",
              "Basic technical details such as your browser type, device and pages visited. If we turn on website analytics (Google Analytics), it collects this through cookies."
            ]
          },
          "Payment details: when you pay, you enter your card details with Stripe, or log in to PayPal. We never see or store your full card number."
        ]
      },
      {
        id: "use",
        title: "How we use your information",
        body: [
          {
            list: [
              "To take, ship and deliver your orders, and to email you order confirmations and tracking details.",
              "To bill Subscribe & Save deliveries you've signed up for.",
              "To answer your questions and handle returns, refunds and damaged items.",
              "To send a reminder if you started checkout but didn't finish it.",
              ...(f.ecoware ? ["To send free samples and prepare wholesale quotes you ask for."] : ["To reply to wholesale inquiries."]),
              "To prevent fraud, keep our website secure, and meet tax, accounting and other legal obligations.",
              "To understand how our website is used, so we can improve it."
            ]
          }
        ]
      },
      {
        id: "share",
        title: "Who we share it with",
        body: [
          "We don't sell your personal information. We share it only with companies that help us run our store, and only as much as they need:",
          {
            list: [
              "Payments: Stripe and PayPal.",
              "Shipping: shipping carriers, and the label service we use to create shipping labels.",
              "Email: the service that delivers our order emails.",
              "Website hosting and database: the companies that host our website and store our order records.",
              "Analytics: Google Analytics, if it's turned on."
            ]
          },
          "We may also share information if the law requires it, to protect our rights or customers, or if our business is sold or reorganized."
        ]
      },
      {
        id: "cookies",
        title: "Cookies and similar technologies",
        body: [
          "We use your browser's storage to remember your cart. Analytics cookies, when turned on, help us count visits. Stripe and PayPal may set their own cookies on their payment pages. You can block or delete cookies in your browser settings, but parts of the site, such as the cart, may not work without them."
        ]
      },
      {
        id: "emails",
        title: "Emails from us",
        body: [
          "We send emails about your orders, such as confirmations and shipping updates, and a reminder if you leave checkout without finishing. To stop checkout reminders, reply to the email or contact us. We'll still send emails you need about orders you place."
        ]
      },
      {
        id: "keep",
        title: "How long we keep information",
        body: [
          "We keep order records for as long as we need them for your orders, returns, and our tax and accounting records. We delete or anonymize information we no longer need."
        ]
      },
      {
        id: "security",
        title: "How we protect it",
        body: [
          "Our website uses encrypted (HTTPS) connections, and payments are handled by Stripe and PayPal. We limit who can see customer information. No system is completely secure, but we work to protect your information."
        ]
      },
      {
        id: "choices",
        title: "Your choices and rights",
        body: [
          "You can ask us to show, correct or delete the personal information we hold about you, or to stop sending reminder emails. Contact us using the details below. We may need to keep some records, such as order and tax records, when the law requires it. Depending on the state you live in, you may have more rights under state privacy laws, and we'll honor them as required."
        ]
      },
      {
        id: "children",
        title: "Children",
        body: [
          "Our website is meant for adults and is not directed at children under 13. We don't knowingly collect information from children under 13."
        ]
      },
      {
        id: "changes",
        title: "Changes to this policy",
        body: [
          "If we change this policy, we'll post the new version on this page and update the date at the top."
        ]
      }
    ]
  };
}

function termsPage(f, c) {
  return {
    title: "Terms of Service",
    description: `The terms that apply when you use the ${f.brand} website or buy from us.`,
    intro: `These terms apply when you use the ${f.brand} website or place an order with us. By using the website or placing an order, you agree to them.`,
    sections: [
      {
        id: "about",
        title: "About us",
        body: [
          `${f.brand} is a brand of ${c.operator}, based in ${c.location}. "We", "us" and "our" mean ${c.operator}.`
        ]
      },
      {
        id: "orders",
        title: "Orders",
        body: [
          "When you place an order, we email you a confirmation. We may cancel an order, or part of one, if an item is out of stock, a price was clearly wrong, or we suspect fraud. If we cancel after you've paid, we refund you in full."
        ]
      },
      {
        id: "prices",
        title: "Prices and payment",
        body: [
          "Prices are in US dollars. Shipping and any sales tax are shown at checkout before you pay. Payments are processed by Stripe or PayPal. By paying, you confirm you're allowed to use that payment method."
        ]
      },
      {
        id: "shipping",
        title: "Shipping, returns and refunds",
        body: [
          [
            "Shipping is covered by our ",
            link("page:shipping", "Shipping Policy"),
            ", and returns, refunds and damaged items by our ",
            link("page:returns", "Returns & Refunds policy"),
            ". Both are part of these terms."
          ]
        ]
      },
      {
        id: "subscriptions",
        title: "Subscribe & Save",
        body: [
          "If you sign up for Subscribe & Save, you authorize us to charge your payment method for each delivery, at the frequency you chose, until you cancel. To skip, change or cancel, contact us before your next order date. A delivery that has already been charged or shipped is covered by our Returns & Refunds policy."
        ]
      },
      {
        id: "wholesale",
        title: "Wholesale orders",
        body: [
          f.ecoware
            ? "When we send you a wholesale quote, the prices, payment and delivery terms on that quote apply to that order. Free samples depend on availability, and we may limit how many we send."
            : "Wholesale prices and terms we agree with you in writing apply to those orders. Otherwise, these terms apply."
        ]
      },
      {
        id: "products",
        title: "Product information",
        body: [
          f.ecoware
            ? "We work to describe our products accurately, but colors and sizes may look slightly different from photos. Please follow the use guidance on the product page and packaging. How well items break down depends on local composting facilities."
            : "We work to describe our products accurately, but packaging and colors may look slightly different from photos. Please follow the storage and cooking guidance on the package."
        ]
      },
      {
        id: "reviews",
        title: "Reviews and content you send us",
        body: [
          "If you submit a review or other content, you allow us to show it on our website and in our marketing. Please keep reviews honest and respectful. We may remove content that isn't."
        ]
      },
      {
        id: "use",
        title: "Using our website",
        body: [
          "Please don't misuse the website. For example, don't try to break its security, interfere with how it works, or copy large parts of it without permission. Our names, logos, photos and text belong to us and are protected by law."
        ]
      },
      {
        id: "liability",
        title: "Limits on our responsibility",
        body: [
          "We provide the website as it is. To the extent the law allows, we're not responsible for indirect or unexpected losses, and our total responsibility for any order is limited to the amount you paid for it. Nothing in these terms limits rights you have under consumer protection laws that can't be changed by agreement."
        ]
      },
      {
        id: "law",
        title: "Governing law",
        body: [
          "These terms are governed by the laws of the State of Florida and the United States. Before taking any legal action, please contact us so we can try to solve the problem together."
        ]
      },
      {
        id: "changes",
        title: "Changes to these terms",
        body: [
          "We may update these terms. The version posted on this page when you place an order applies to that order."
        ]
      }
    ]
  };
}

const BUILDERS = {
  shipping: shippingPage,
  returns: returnsPage,
  faq: faqPage,
  privacy: privacyPage,
  terms: termsPage
};

/** Content for one policy page of one store ("shakti_foods" or "ecoware"). */
export function getStorePolicy(storefront, pageId) {
  const build = BUILDERS[pageId];

  if (!build) {
    return null;
  }

  const facts = storeFacts(storefront);
  const contact = getPolicyContact();

  return {
    id: pageId,
    brand: facts.brand,
    lastUpdated: POLICY_LAST_UPDATED,
    contact,
    ...build(facts, contact)
  };
}

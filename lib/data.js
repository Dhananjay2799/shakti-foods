export const ecoOverview = {
  shortDescription:
    "Upgrade your foodservice with Simpli Ecoware—the ultimate premium, eco-friendly dinnerware crafted entirely from 100% natural sugarcane bagasse. Designed to replace flimsy plastic and soggy paper, these heavy-duty plant-based alternatives offer unmatched strength without harming the planet. Fully compostable, microwave-safe, and completely oil-resistant, they are engineered to handle everything from heavy catering spreads to quick daily meals. Good for the Earth, good for you.",
  // Step 7: Shorter object-based feature descriptions for EcoWare
  features: [
    {
      title: "100% Compostable",
      description: "Made from renewable sugarcane fiber."
    },
    {
      title: "Heavy-Duty",
      description: "Strong enough for hot and cold meals."
    },
    {
      title: "Microwave & Freezer Safe",
      description: "Designed for food preparation and storage."
    },
    {
      title: "Leak & Oil Resistant",
      description: "Helps prevent liquids and grease from soaking through."
    },
    {
      title: "Chemical-Free",
      description: "No plastic coating or toxic chemicals."
    },
    {
      title: "Natural Finish",
      description: "Clean texture with a premium appearance."
    }
  ]
};

export const riceBags = [
  {
    id: "rice-10",
    slug: "shakti-premium-basmati-rice-10lb",
    size: "10 lb",
    image: "/images/rice-10lb.png",
    label: "Family Pack",
    details: "Ideal for homes and small families.",
    uses: ["Daily use", "Easy to carry", "Premium aroma"],
    unitPrice: 11.99
  },
  {
    id: "rice-20",
    slug: "shakti-premium-basmati-rice-20lb",
    size: "20 lb",
    image: "/images/rice-20lb.png",
    label: "Best Seller",
    details: "Balanced size for homes, stores, and regular buyers.",
    uses: ["Best seller", "Popular retail size", "Strong value"],
    unitPrice: 26.99
  },
  {
    id: "rice-50",
    slug: "shakti-premium-basmati-rice-50lb",
    size: "50 lb",
    image: "/images/rice-50lb.png",
    label: "Wholesale Pack",
    details: "Perfect for restaurants, catering, and wholesale orders.",
    uses: ["Bulk buyers", "Restaurants", "Catering use"],
    unitPrice: 36.99
  }
];

export const products = [
  {
    id: "rice-10",
    slug: "shakti-premium-basmati-rice-10lb",
    name: "Shakti Foods Premium Basmati Rice – 10 lb",
    category: "Rice",
    image: "/images/rice-10lb.png",
    subtitle: "Family Pack with premium aroma, long grains, and everyday convenience.",
    badge: "10 lb",
    unitPrice: 11.99,
    canCheckout: true,
    wholesale: false,
    packSize: "10 lb Family Pack",
    bestFor: "Homes, small families, weekly grocery routines, and everyday meals.",
    shortDescription: "Bring the authentic taste and tradition of premium Indian Basmati rice to your dinner table. Naturally aged and matured to perfection, our 10 lb Family Pack delivers a premium aroma, long grains, and fluffy texture that elevates any everyday meal. Perfectly sized and designed with a convenient handle, it is the ideal addition to your weekly grocery routine.",
    features: [
      {
        title: "Naturally Aged",
        description: "Aged for improved aroma and cooking quality."
      },
      {
        title: "Extra-Long Grains",
        description: "Fluffy grains that remain separate after cooking."
      },
      {
        title: "Authentic Aroma",
        description: "Traditional basmati fragrance and flavor."
      },
      {
        title: "Versatile",
        description: "Ideal for biryani, pulao and everyday meals."
      }
    ],
    seo: {
      title: "Shakti Premium Basmati Rice 10 lb | Family Pack",
      description: "Premium Indian Basmati rice in a 10 lb family pack. Long grains, fluffy texture, rich aroma, and easy-carry packaging for daily meals.",
      keywords: ["Basmati rice supplier", "Indian grocery rice supplier", "10 lb basmati rice"]
    }
  },
  {
    id: "rice-20",
    slug: "shakti-premium-basmati-rice-20lb",
    name: "Shakti Foods Premium Basmati Rice – 20 lb",
    category: "Rice",
    image: "/images/rice-20lb.png",
    subtitle: "Best Seller size for regular buyers, families, and retail supply.",
    badge: "20 lb",
    unitPrice: 26.99,
    canCheckout: true,
    wholesale: false,
    packSize: "20 lb Best Seller",
    bestFor: "Families, regular rice buyers, retail stores, and value-focused shoppers.",
    shortDescription: "Discover why our 20 lb bag is our absolute Best Seller. Striking the perfect balance between everyday home cooking and retail supply, this size offers the ultimate blend of high-quality premium Basmati rice and excellent value. Naturally matured for a rich aroma and long, slender grains, it is the go-to choice for regular buyers and households that love authentic meals.",
    features: [
      {
        title: "Naturally Aged",
        description: "Aged for improved aroma and cooking quality."
      },
      {
        title: "Extra-Long Grains",
        description: "Fluffy grains that remain separate after cooking."
      },
      {
        title: "Authentic Aroma",
        description: "Traditional basmati fragrance and flavor."
      },
      {
        title: "Versatile",
        description: "Ideal for biryani, pulao and everyday meals."
      }
    ],
    seo: {
      title: "Shakti Premium Basmati Rice 20 lb | Best Seller",
      description: "Best-selling 20 lb premium Basmati rice bag with aged long grains, fluffy texture, and excellent value for regular buyers.",
      keywords: ["Basmati rice supplier", "Wholesale rice bag", "20 lb basmati rice"]
    }
  },
  {
    id: "rice-50",
    slug: "shakti-premium-basmati-rice-50lb",
    name: "Shakti Foods Premium Basmati Rice – 50 lb",
    category: "Rice",
    image: "/images/rice-50lb.png",
    subtitle: "Wholesale Pack for restaurants, catering, and high-volume kitchens.",
    badge: "50 lb",
    unitPrice: 36.99,
    canCheckout: true,
    wholesale: true,
    packSize: "50 lb Wholesale Pack",
    bestFor: "Restaurants, catering services, commercial kitchens, and wholesale distributors.",
    shortDescription: "Engineered for high-volume kitchens, our 50 lb Commercial Wholesale Pack delivers the uncompromised quality of Shakti Foods Premium Basmati Rice on a grand scale. Whether you run a bustling restaurant, a busy catering service, or a wholesale distribution business, this bulk pack ensures consistent culinary results, exceptional grain elongation, and maximum profitability for your kitchen.",
    features: [
      {
        title: "Naturally Aged",
        description: "Aged for improved aroma and cooking quality."
      },
      {
        title: "Extra-Long Grains",
        description: "Fluffy grains that remain separate after cooking."
      },
      {
        title: "Authentic Aroma",
        description: "Traditional basmati fragrance and flavor."
      },
      {
        title: "Versatile",
        description: "Ideal for biryani, pulao and everyday meals."
      }
    ],
    seo: {
      title: "Wholesale 50 lb Basmati Rice Bag | Shakti Foods",
      description: "50 lb wholesale premium Basmati rice for restaurants, caterers, commercial kitchens, and foodservice buyers.",
      keywords: ["Wholesale rice bag", "Basmati rice supplier", "restaurant rice supplier"]
    }
  },
  {
    id: "plate-9",
    slug: "simpli-ecoware-9-compartment-meal-plate",
    name: "Simpli Ecoware 9-Compartment Meal Plate",
    category: "EcoWare",
    image: "/images/plate-9-compartment.png",
    subtitle: "25 PCS pack for thalis, weddings, catering, and premium event buffets.",
    badge: "25 pcs",
    unitPrice: 15.99,
    canCheckout: true,
    wholesale: true,
    packSize: "25 pieces per pack",
    bestFor: "Weddings, traditional festive feasts like Indian Thalis, catering, large gatherings, and premium event buffets.",
    shortDescription: ecoOverview.shortDescription,
    features: [
      ...ecoOverview.features,
      "Unique Feature: 9 separate deep compartments to completely isolate multiple curries, sides, mains, and desserts on a single plate without mixing flavors.",
      "Pack Size: 25 pieces per pack."
    ],
    seo: { title: "9 Compartment Compostable Meal Plates | Simpli Ecoware", description: "Heavy-duty 9 compartment sugarcane bagasse meal plates for thalis, catering, weddings, and large gatherings.", keywords: ["disposable compartment trays", "catering disposable plates", "sugarcane plates bulk"] }
  },
  {
    id: "bowl",
    slug: "simpli-ecoware-240ml-bowl",
    name: "Simpli Ecoware 240 ml Bowl",
    category: "EcoWare",
    image: "/images/bowl-240ml.png",
    subtitle: "50 PCS pack for soups, curries, salads, sides, and portion control.",
    badge: "50 pcs",
    unitPrice: 14.99,
    canCheckout: true,
    wholesale: true,
    packSize: "50 pieces per pack",
    bestFor: "Restaurants, food trucks, catering, salads, acai bowls, soups, curries, and side dishes.",
    shortDescription: ecoOverview.shortDescription,
    features: [...ecoOverview.features, "Unique Feature: A deep, compact design optimized for portion control and stackable takeaway or buffet presentation.", "Pack Size: 50 pieces per pack."],
    seo: { title: "240 ml Compostable Sugarcane Bowls | Simpli Ecoware", description: "50 pack of 240 ml compostable bagasse bowls for restaurants, catering, soups, curries, sides, and foodservice.", keywords: ["biodegradable bowls", "sugarcane bowls bulk", "eco-friendly food containers"] }
  },
  {
    id: "box",
    slug: "simpli-ecoware-8x8-plain-food-box",
    name: "Simpli Ecoware 8\" x 8\" Plain Food Box",
    category: "EcoWare",
    image: "/images/container-8x8.png",
    subtitle: "50 PCS clamshell food box for takeout, delivery, leftovers, and packed lunches.",
    badge: "50 pcs",
    unitPrice: 17.99,
    canCheckout: true,
    wholesale: true,
    packSize: "50 pieces per pack",
    bestFor: "Takeout orders, food delivery, picnics, leftovers, food trucks, and packed lunches.",
    shortDescription: ecoOverview.shortDescription,
    features: [...ecoOverview.features, "Unique Feature: Secure hinged-lid clamshell design that locks tightly to keep food fresh, hot, and spill-free during transport.", "Pack Size: 50 pieces per pack."],
    seo: { title: "8x8 Compostable Food Boxes | Simpli Ecoware", description: "50 pack of 8x8 compostable sugarcane bagasse clamshell food boxes for takeout, delivery, food trucks, and packed meals.", keywords: ["compostable sugarcane bagasse food boxes", "eco-friendly food containers", "takeout boxes"] }
  },
  {
    id: "plate-12",
    slug: "simpli-ecoware-12-inch-round-plate",
    name: "Simpli Ecoware 12\" Round Plate",
    category: "EcoWare",
    image: "/images/plate-12.png",
    subtitle: "25 PCS pack with a large surface area for pizzas, platters, and dinner servings.",
    badge: "25 pcs",
    unitPrice: 10.99,
    canCheckout: true,
    wholesale: true,
    packSize: "25 pieces per pack",
    bestFor: "Whole large pizzas, shared platters, standard buffet mains, and heavy dinner servings.",
    shortDescription: ecoOverview.shortDescription,
    features: [...ecoOverview.features, "Unique Feature: Massive 12-inch wide surface area providing ample space for large portions or beautifully plated main courses.", "Pack Size: 25 pieces per pack."],
    seo: { title: "12 Inch Compostable Round Plates | Simpli Ecoware", description: "25 pack of heavy-duty 12 inch compostable sugarcane plates for platters, pizzas, buffet mains, and catering.", keywords: ["sugarcane plates bulk", "catering disposable plates", "compostable plates wholesale"] }
  },
  {
    id: "plate-3cp",
    slug: "simpli-ecoware-9-inch-3-compartment-plate",
    name: "Simpli Ecoware 9\" 3-Compartment Plate",
    category: "EcoWare",
    image: "/images/plate-3cp.png",
    subtitle: "50 PCS pack for daily meals, casual parties, restaurants, cafeterias, and side dishes.",
    badge: "50 pcs",
    unitPrice: 17.99,
    canCheckout: true,
    wholesale: true,
    packSize: "50 pieces per pack",
    bestFor: "Daily home use, casual parties, fast-casual restaurants, and school or office cafeterias.",
    shortDescription: ecoOverview.shortDescription,
    features: [...ecoOverview.features, "Unique Feature: Classical 3-section layout perfectly proportioned to isolate a main dish from two side items like burgers and fries.", "Pack Size: 50 pieces per pack."],
    seo: { title: "9 Inch 3 Compartment Compostable Plates | Simpli Ecoware", description: "50 pack of 9 inch 3 compartment compostable sugarcane plates for restaurants, cafeterias, parties, and daily meals.", keywords: ["compostable 3 compartment plates", "catering disposable plates", "sugarcane plates bulk"] }
  },
  {
    id: "tray-5cp",
    slug: "simpli-ecoware-5-cp-meal-tray",
    name: "Simpli Ecoware 5 CP Meal Tray",
    category: "EcoWare",
    image: "/images/plate-5cp.png",
    subtitle: "50 PCS pack with a high-capacity rectangular layout for organized meal service.",
    badge: "50 pcs",
    unitPrice: 19.99,
    canCheckout: true,
    wholesale: true,
    packSize: "50 pieces per pack",
    bestFor: "Corporate catering, meal prep delivery, institutional food services, and partitioned party platters.",
    shortDescription: ecoOverview.shortDescription,
    features: [...ecoOverview.features, "Unique Feature: Sleek, high-capacity rectangular layout with 5 distinct compartments designed for neat meal combos and beautifully presented multi-course lunch options.", "Pack Size: 50 pieces per pack."],
    seo: { title: "Bulk 5 CP Compostable Meal Trays | Wholesale Ecoware", description: "Heavy-duty, leak-proof 5 compartment meal trays made from 100% compostable sugarcane bagasse. Perfect for catering, cafeterias, and takeout.", keywords: ["Bulk 5 CP meal trays", "Eco-friendly 5 compartment meal trays wholesale", "Wholesale compostable food packaging for restaurants"] }
  }
];

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug);
}

export function getCheckoutProducts() {
  return products.filter((product) => product.canCheckout);
}

export const testimonials = [
  { name: "Retail Customer", text: "The rice size switching now feels much more real and premium." },
  { name: "Catering Buyer", text: "The EcoWare products look modern and the shopping flow is much easier." },
  { name: "Wholesale Partner", text: "The brand presentation now feels trustworthy, polished, and business-ready." }
];

export function formatPrice(value) {
  if (value === null || value === undefined) return "Request Wholesale Price";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
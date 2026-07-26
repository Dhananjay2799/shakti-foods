"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { productToGaItem, trackEvent } from "@/lib/analytics";
import WholesaleInquiryForm from "@/components/WholesaleInquiryForm";
import ProductSpecificationsPanel from "@/components/ProductSpecificationsPanel";
import ProductCertificationsPanel from "@/components/ProductCertificationsPanel";
import ProductImageGallery from "@/components/ProductImageGallery";
import RelatedProducts from "@/components/RelatedProducts";

export default function ProductDetailClient({ 
  product, 
  specifications, 
  certifications = [],
  relatedProducts = [] 
}) {
  const { addItem } = useCart();

  useEffect(() => {
    trackEvent("view_item", {
      currency: "USD",
      value: product.unitPrice || 0,
      items: [productToGaItem(product)]
    });
  }, [product]);

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      
      {/* Product Hero Section */}
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <Link href="/products" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft">
            ← Back to Products
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            
            {/* Image Gallery Container */}
            <div className="rounded-[2rem] bg-white p-5 shadow-lift md:p-8">
              <ProductImageGallery 
                images={product.images?.length ? product.images : [
                  {
                    id: "primary",
                    url: product.image,
                    altText: product.name,
                    isPrimary: true
                  }
                ]} 
                productName={product.name} 
              />
            </div>

            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-black ring-1 ring-black/15">
                {product.badge}
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-black md:text-6xl">
                {product.name}
              </h1>
              <p className="mt-5 text-lg leading-8 text-black">
                {product.shortDescription}
              </p>

              <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="grid gap-3 text-black sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[.16em]">Pack Size</div>
                    <div className="mt-1">{product.packSize}</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[.16em]">Price</div>
                    <div className="mt-1 font-bold">{formatPrice(product.unitPrice)}</div>
                  </div>
                </div>
                
                <div className="mt-6">
                  {product.canCheckout ? (
                    <button onClick={() => addItem(product)} className="w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] sm:w-auto">
                      Add to Cart
                    </button>
                  ) : (
                    <a href="#wholesale" className="inline-flex w-full justify-center rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] sm:w-auto">
                      Request Wholesale Price
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended complete content order (Step 6) */}
      <div className="container-brand section-pad grid gap-6 pb-14 md:pb-20">
        
        {/* Specifications */}
        {specifications ? (
          <ProductSpecificationsPanel specifications={specifications} />
        ) : null}

        {/* Existing Key Features */}
        <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
          <h2 className="font-display text-3xl font-bold text-black">Key Features</h2>
          <ul className="mt-5 grid gap-4">
            {product.features?.map((feature, idx) => (
              <li key={idx} className="rounded-2xl bg-[#f8f4ed] p-4 leading-7 text-black">
                {typeof feature === 'string' ? feature : (
                  <><strong className="font-bold">{feature.title}</strong>: {feature.description}</>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Existing Best For */}
        <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
          <h2 className="font-display text-3xl font-bold text-black">Best For</h2>
          <p className="mt-3 leading-8 text-black">{product.bestFor}</p>
        </section>

        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />

        {/* Wholesale + Certifications */}
        <div id="wholesale" className="grid items-stretch gap-6 scroll-mt-28 lg:grid-cols-2">
          {product.wholesale ? (
            <WholesaleInquiryForm productName={product.name} />
          ) : (
            <div></div>
          )}
          
          <ProductCertificationsPanel certifications={certifications} />
        </div>

      </div>
    </main>
  );
}
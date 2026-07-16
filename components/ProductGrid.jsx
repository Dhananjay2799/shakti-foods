"use client";

import { useState } from "react";
import { products } from "@/lib/data";
import ProductCard from "./ProductCard";
import SectionHeading from "./SectionHeading";

const categories = ["All", "Rice", "EcoWare"];

export default function ProductGrid() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const visibleProducts = selectedCategory === "All" ? products : products.filter((product) => product.category === selectedCategory);

  return (
    <section className="section-pad bg-white py-16 text-black md:py-28">
      <div className="container-brand">
        <SectionHeading
          eyebrow="Featured Products"
          title="Shop retail rice or request wholesale pricing."
          text="Small rice packs support direct checkout. Bulk rice and Simpli Ecoware products are routed to wholesale inquiry for better pricing and shipping accuracy."
        />
        <div className="mt-7 flex flex-wrap gap-3 md:mt-8">
          {categories.map((category) => (
            <button key={category} onClick={() => setSelectedCategory(category)} className={`rounded-full border px-5 py-3 text-sm font-bold transition ${selectedCategory === category ? "border-black bg-black text-white" : "border-black/15 bg-white text-black hover:border-black"}`}>{category}</button>
          ))}
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>
      </div>
    </section>
  );
}

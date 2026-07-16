'use client';

import { motion } from 'framer-motion';
import { testimonials } from '@/lib/data';
import SectionHeading from './SectionHeading';

export default function Testimonials() {
  return (
    <section className="section-pad bg-[#2c1a17] py-20 md:py-28">
      <div className="container-brand">
        <SectionHeading eyebrow="Customer Confidence" title="A website experience buyers can trust." text="Use this section for real testimonials later. For now it demonstrates the calmer premium tone of Version 2." light />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.div key={item.name} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * .08, duration: .55 }} viewport={{ once: true }} className="rounded-[2rem] bg-white/10 p-6 backdrop-blur-xl">
              <div className="font-display text-2xl font-bold text-white">{item.name}</div>
              <div className="mt-3 leading-8 text-white/74">“{item.text}”</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
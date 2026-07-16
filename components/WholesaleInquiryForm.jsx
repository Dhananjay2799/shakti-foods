"use client";

import { useState } from "react";
import { site, whatsappLink, mailtoLink } from "@/lib/site";

const initialForm = { name: "", email: "", phone: "", company: "", product: "", quantity: "", message: "" };

export default function WholesaleInquiryForm({ productName = "" }) {
  const [form, setForm] = useState({ ...initialForm, product: productName });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to submit inquiry.");

      setStatus({
        type: "success",
        message: data.fallback ? "Inquiry prepared. Use Email or WhatsApp below to send it now." : "Inquiry sent successfully. We will contact you soon.",
        mailto: data.mailto,
        whatsapp: data.whatsapp
      });
      setForm({ ...initialForm, product: productName });
    } catch (error) {
      const body = `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nCompany: ${form.company}\nProduct: ${form.product}\nQuantity: ${form.quantity}\nMessage: ${form.message}`;
      setStatus({
        type: "error",
        message: "Email server is not configured yet. You can still send through Email or WhatsApp.",
        mailto: mailtoLink("Wholesale Inquiry", body),
        whatsapp: whatsappLink(`Wholesale inquiry\n${body}`)
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 text-black shadow-soft ring-1 ring-black/5 md:p-6">
      <div className="font-display text-3xl font-bold text-black">Wholesale Inquiry</div>
      <p className="mt-2 text-sm leading-6 text-black">
        For bulk rice, EcoWare packs, restaurant supply, and catering orders, contact us at{" "}
        <a className="font-bold underline" href={`tel:${site.phoneRaw}`}>{site.phone}</a>.
      </p>

      <div className="mt-6 grid gap-4">
        <input name="name" value={form.name} onChange={handleChange} required className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Your name" />
        <div className="grid gap-4 md:grid-cols-2">
          <input type="email" name="email" value={form.email} onChange={handleChange} required className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Email" />
          <input name="phone" value={form.phone} onChange={handleChange} className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Phone" />
        </div>
        <input name="company" value={form.company} onChange={handleChange} className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Company / restaurant / store" />
        <div className="grid gap-4 md:grid-cols-2">
          <input name="product" value={form.product} onChange={handleChange} className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Product interest" />
          <input name="quantity" value={form.quantity} onChange={handleChange} className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Estimated quantity" />
        </div>
        <textarea name="message" value={form.message} onChange={handleChange} rows="5" className="rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-black" placeholder="Message" />
      </div>

      {status ? (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${status.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
          <div>{status.message}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {status.mailto ? <a className="rounded-full bg-black px-4 py-2 text-white" href={status.mailto}>Send Email</a> : null}
            {status.whatsapp ? <a className="rounded-full bg-[#25D366] px-4 py-2 text-white" href={status.whatsapp} target="_blank" rel="noreferrer">Send WhatsApp</a> : null}
          </div>
        </div>
      ) : null}

      <button disabled={loading} className="mt-5 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:opacity-60">
        {loading ? "Sending..." : "Submit Wholesale Inquiry"}
      </button>
    </form>
  );
}

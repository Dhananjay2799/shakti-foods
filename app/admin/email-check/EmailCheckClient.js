"use client";

import { useCallback, useEffect, useState } from "react";

const TESTS = [
  { kind: "shakti", label: "Shakti Foods order" },
  { kind: "shakti_subscription", label: "Shakti Foods subscription" },
  { kind: "ecoware", label: "Simpli Ecoware order" }
];

function StatusPill({ ok, children }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
        ok
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-900"
      }`}
    >
      {children}
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-black/55">{label}</div>
      <div className="break-all text-sm font-semibold sm:text-right">
        {children}
      </div>
    </div>
  );
}

export default function EmailCheckClient() {
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState("");
  const [results, setResults] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/email-check", {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load the email check.");
      }

      setCheck(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendTest(kind) {
    setSending(kind);

    try {
      const response = await fetch("/api/admin/email-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind })
      });
      const data = await response.json();

      setResults((current) => [
        { ...data, ok: response.ok, at: new Date().toLocaleTimeString() },
        ...current
      ]);
    } catch (sendError) {
      setResults((current) => [
        {
          kind,
          ok: false,
          message:
            sendError instanceof Error ? sendError.message : String(sendError),
          at: new Date().toLocaleTimeString()
        },
        ...current
      ]);
    } finally {
      setSending("");
    }
  }

  return (
    <div className="mt-10 space-y-6">
      <section className="rounded-[1.5rem] bg-white p-6 shadow md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Live setup</h2>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full bg-[#f2eadc] px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {loading ? "Checking…" : "Re-check"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {check ? (
          <div className="mt-4">
            <Row label="Environment">{check.environment || "unknown"}</Row>
            <Row label="Resend API key">
              <StatusPill ok={check.resend.apiKeyConfigured}>
                {check.resend.apiKeyConfigured ? "Configured" : "Missing"}
              </StatusPill>
            </Row>
            {check.resend.domainsError ? (
              <Row label="Resend domains">{check.resend.domainsError}</Row>
            ) : null}

            {check.senders.map((sender) => (
              <div key={sender.storefront} className="mt-4 rounded-xl bg-[#faf7f1] p-4">
                <div className="font-bold">{sender.businessName}</div>
                <Row label="Sends from">{sender.from}</Row>
                <Row label="Sending domain in Resend">
                  <StatusPill ok={sender.domainStatus === "verified"}>
                    {sender.domainStatus}
                  </StatusPill>
                </Row>
                <Row label="Reply-to">{sender.replyTo || "—"}</Row>
                <Row label="Links to">{sender.siteUrl}</Row>
              </div>
            ))}

            <div className="mt-4 rounded-xl bg-[#faf7f1] p-4">
              <div className="font-bold">Email tracking (Supabase)</div>
              <Row label="Migration">
                <StatusPill ok={check.tracking.applied}>
                  {check.tracking.applied ? "Installed" : "Not installed"}
                </StatusPill>
              </Row>
              {!check.tracking.applied ? (
                <Row label="Next step">{check.tracking.detail}</Row>
              ) : null}
              {check.tracking.last7Days ? (
                <Row label="Paid orders, last 7 days">
                  {check.tracking.last7Days.sent} sent ·{" "}
                  {check.tracking.last7Days.failed} failed ·{" "}
                  {check.tracking.last7Days.notTracked} before tracking
                </Row>
              ) : null}
              {(check.tracking.recentFailures || []).map((failure) => (
                <Row
                  key={failure.orderNumber}
                  label={`#${failure.orderNumber} (${failure.storefront})`}
                >
                  {failure.lastError}
                </Row>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.5rem] bg-white p-6 shadow md:p-8">
        <h2 className="font-display text-2xl font-bold">Send a test email</h2>
        <p className="mt-2 text-sm leading-6 text-black/60">
          Sends a sample confirmation to {check?.adminEmail || "your admin email"}.
          No order is created and nothing is charged. The subject starts with
          “[Test]”.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {TESTS.map((test) => (
            <button
              key={test.kind}
              type="button"
              onClick={() => sendTest(test.kind)}
              disabled={Boolean(sending)}
              className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {sending === test.kind ? "Sending…" : `Send ${test.label}`}
            </button>
          ))}
        </div>

        {results.length ? (
          <ul className="mt-6 space-y-3">
            {results.map((result, index) => (
              <li
                key={`${result.at}-${index}`}
                className={`rounded-xl p-4 text-sm ${
                  result.ok ? "bg-emerald-50" : "bg-red-50"
                }`}
              >
                <div className="font-bold">
                  {result.ok ? "Sent" : "Failed"} · {result.at}
                </div>
                {result.subject ? <div>Subject: {result.subject}</div> : null}
                {result.from ? <div>From: {result.from}</div> : null}
                {result.to ? <div>To: {result.to}</div> : null}
                {result.message ? (
                  <div className="text-red-800">{result.message}</div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

import { NextResponse } from "next/server";
import {
  adminCodeMatches,
  checkoutAdjustEnabled,
  clientKey,
  issueAdjustToken,
  recordFailure,
  tooManyFailures
} from "@/lib/checkout-adjustment-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Checks the admin code for the checkout "Adjust amount" option and,
 * when it matches, returns a short-lived signed token. The code itself
 * is never sent back.
 */
export async function POST(request) {
  if (!checkoutAdjustEnabled()) {
    return NextResponse.json(
      { message: "Adjusting the amount isn't set up yet." },
      { status: 503 }
    );
  }

  const key = clientKey(request);

  if (tooManyFailures(key)) {
    return NextResponse.json(
      { message: "Too many wrong codes. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));

  if (!adminCodeMatches(body?.code)) {
    recordFailure(key);
    await wait(1200);

    return NextResponse.json({ message: "That code isn't correct." }, { status: 401 });
  }

  return NextResponse.json({ token: issueAdjustToken() });
}

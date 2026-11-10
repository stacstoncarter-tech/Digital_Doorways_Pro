import { createClient } from "@/lib/supabase/server";
import { parseDraft } from "@/lib/smart-estimate/engine";
import { estimatePdf } from "@/lib/smart-estimate/pdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return new Response("Invalid estimate", { status: 400 });
  const { data: m } = await db
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!m) return new Response("Forbidden", { status: 403 });
  const { data: s } = await db
    .from("smart_estimate_drafts")
    .select("snapshot,estimate_id")
    .eq("id", id)
    .eq("business_id", m.business_id)
    .single();
  if (!s?.estimate_id)
    return new Response("Saved estimate not found", { status: 404 });
  const { data: estimate } = await db
    .from("estimates")
    .select("id")
    .eq("id", s.estimate_id)
    .eq("business_id", m.business_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!estimate) return new Response("Estimate unavailable", { status: 404 });
  try {
    const d = parseDraft(s.snapshot);
    const [{ data: c }, { data: a }] = await Promise.all([
      db
        .from("customers")
        .select("name")
        .eq("id", d.customerId)
        .eq("business_id", m.business_id)
        .single(),
      db
        .from("customer_addresses")
        .select("address")
        .eq("id", d.serviceAddressId)
        .eq("business_id", m.business_id)
        .single(),
    ]);
    const logo = await readFile(
      path.join(process.cwd(), "public/power-clean-estimate-logo.png"),
    );
    const bytes = await estimatePdf(
      d,
      c?.name ?? "Customer",
      a?.address ?? "",
      s.estimate_id,
      logo,
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="Power-Clean-Estimate.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Unable to generate estimate PDF", { status: 400 });
  }
}

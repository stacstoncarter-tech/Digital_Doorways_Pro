"use server";
import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_SERVICE_ADDRESS, calculate, parseDraft, type Draft } from "@/lib/smart-estimate/engine";
import { revalidatePath } from "next/cache";
async function context() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw Error("Please sign in.");
  const { data: m } = await db
    .from("business_members")
    .select("business_id,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!m || !["owner", "admin", "staff"].includes(m.role))
    throw Error("Estimate access required.");
  return { db, user, businessId: m.business_id as string };
}
async function validateCustomer(
  d: Draft,
  ctx: Awaited<ReturnType<typeof context>>,
) {
  const { data } = await ctx.db
    .from("customers")
    .select("id,service_address")
    .eq("id", d.customerId)
    .eq("business_id", ctx.businessId)
    .maybeSingle();
  if (!data) throw Error("Select a customer in your business.");
  if (d.serviceAddressId === CUSTOMER_SERVICE_ADDRESS) {
    if (!data.service_address?.trim()) throw Error("This customer has no saved service address.");
    return;
  }
  if (d.serviceAddressId) {
    const { data: p } = await ctx.db
      .from("customer_addresses")
      .select("id")
      .eq("id", d.serviceAddressId)
      .eq("customer_id", d.customerId)
      .eq("business_id", ctx.businessId)
      .maybeSingle();
    if (!p) throw Error("Select an address belonging to this customer.");
  }
}
export async function listSmartDrafts() {
  try {
    const ctx = await context();
    const { data, error } = await ctx.db
      .from("smart_estimate_drafts")
      .select("id,name,updated_at,estimate_id")
      .eq("business_id", ctx.businessId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return {
      drafts: data as {
        id: string;
        name: string;
        updated_at: string;
        estimate_id: string | null;
      }[],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not load drafts." };
  }
}
export async function loadSmartDraft(id: string) {
  try {
    const ctx = await context();
    const { data, error } = await ctx.db
      .from("smart_estimate_drafts")
      .select("snapshot,estimate_id")
      .eq("id", id)
      .eq("business_id", ctx.businessId)
      .single();
    if (error) throw error;
    return {
      snapshot: parseDraft(data.snapshot),
      estimateId: data.estimate_id as string | null,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Draft unavailable." };
  }
}
export async function saveSmartDraft(value: unknown, id?: string) {
  try {
    const d = parseDraft(value),
      ctx = await context();
    await validateCustomer(d, ctx);
    const values = {
      business_id: ctx.businessId,
      customer_id: d.customerId,
      created_by: ctx.user.id,
      name: d.areas[0].name,
      snapshot: d,
      updated_at: new Date().toISOString(),
    };
    const query = id
      ? ctx.db
          .from("smart_estimate_drafts")
          .update(values)
          .eq("id", id)
          .eq("business_id", ctx.businessId)
          .is("estimate_id", null)
      : ctx.db.from("smart_estimate_drafts").insert(values);
    const { data, error } = await query.select("id").single();
    if (error) throw error;
    return { draftId: data.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save draft." };
  }
}
export async function finalizeSmartEstimate(value: unknown, id?: string) {
  try {
    if (!id) throw Error("Save a draft before finalizing.");
    const d = parseDraft(value),
      r = calculate(d),
      ctx = await context();
    await validateCustomer(d, ctx);
    if (!d.serviceAddressId)
      throw Error("Choose a service address before finalizing.");
    if (r.errors.length) throw Error(r.errors.join(" "));
    const items = r.rows.map((x) => ({
      description: (
        x.description +
        (x.showDimensions
          ? " · " + x.dimensions + " · " + x.area.toFixed(2) + " sq ft"
          : "")
      ).slice(0, 2000),
      fixed_price: x.price,
    }));
    const { data, error } = await ctx.db.rpc("finalize_smart_estimate", {
      p_draft_id: id || null,
      p_customer_id: d.customerId,
      p_address_id: d.serviceAddressId === CUSTOMER_SERVICE_ADDRESS ? null : d.serviceAddressId,
      p_snapshot: d,
      p_items: items,
    });
    if (error) throw error;
    revalidatePath("/estimates/history");
    revalidatePath("/customers/" + d.customerId);
    return {
      draftId: data.draft_id as string,
      estimateId: data.estimate_id as string,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not finalize estimate.",
    };
  }
}

import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { calculate, defaults, newArea, geometry, parseDraft } from '../lib/smart-estimate/engine.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, 'https://snsnhnovinjqpiwrqspe.supabase.co');
assert.equal(process.env.POWER_CLEAN_QA_EMAIL, 'power-clean-automation@example.invalid');
const cookies = new Map();
const db = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: values => values.forEach(({ name, value }) => cookies.set(name, value)) },
});
function checked(result, step) {
  if (result.error) throw Error(`${step} failed (${result.error.code ?? 'unknown'})`);
  return result.data;
}
const { user } = checked(await db.auth.signInWithPassword({
  email: process.env.POWER_CLEAN_QA_EMAIL, password: process.env.POWER_CLEAN_QA_PASSWORD,
}), 'Sign in');
try {
  const member = checked(await db.from('business_members').select('business_id')
    .eq('user_id', user.id).single(), 'Membership');
  const business = checked(await db.from('businesses').select('name')
    .eq('id', member.business_id).single(), 'Business');
  assert.equal(business.name, 'Power Clean Automation QA');
  const run = randomUUID();
  const customer = checked(await db.from('customers').insert({
    business_id: member.business_id, name: `Disposable canopy QA ${run}`,
    service_address: '123 QA Test Street',
  }).select('id').single(), 'Create customer');
  const address = checked(await db.from('customer_addresses').insert({
    business_id: member.business_id, customer_id: customer.id, address: '123 QA Test Street',
  }).select('id').single(), 'Create address');
  const config = defaults();
  config.costsReviewed = true;
  config.minimum = 0;
  for (const product of Object.values(config.products)) {
    product.shipping = 0;
    product.productVerified = true;
    product.assumptionsReviewed = true;
  }
  // Synthetic reviewed assumptions apply to this disposable snapshot only.
  const face = { shape: 'rectangle', length: { ft: 3, inches: 2 },
    width: { ft: 3, inches: 4 }, secondBase: { ft: 0, inches: 0 } };
  const area = { ...newArea(), name: 'QA canopy', kind: 'canopy', material: 'concrete',
    canopyFaces: { top: face, underside: face }, accessMinutes: 30 };
  assert.equal((geometry(area).area * 144).toFixed(0), '3040');
  const draft = { version: 1, customerId: customer.id, serviceAddressId: address.id,
    notes: 'Disposable QA only. Synthetic cost assumptions.', config, areas: [area] };
  const baseline = calculate(draft);
  assert.deepEqual(baseline.errors, []);
  for (const method of ['percent', 'fixed']) {
    const discounted = calculate({ ...draft, discounts: [{ id: randomUUID(), category: 'custom',
      method, value: 5, serviceKey: null, reason: 'QA discount' }] });
    assert.deepEqual(discounted.errors, []);
    assert.ok(discounted.total < baseline.total);
    assert.ok(discounted.margin < baseline.margin);
  }
  console.log('PASS canopy dimensions, chemicals, access time, percentage and fixed discounts');
  for (const response of ['accepted', 'declined']) {
    const saved = checked(await db.from('smart_estimate_drafts').insert({
      business_id: member.business_id, customer_id: customer.id, created_by: user.id,
      name: `QA canopy ${response} ${run}`, snapshot: draft,
    }).select('id').single(), 'Save draft');
    const reopened = checked(await db.from('smart_estimate_drafts').select('snapshot')
      .eq('id', saved.id).single(), 'Reopen draft');
    assert.deepEqual(parseDraft(reopened.snapshot).areas[0].canopyFaces, area.canopyFaces);
    const result = calculate(reopened.snapshot);
    const args = { p_draft_id: saved.id, p_customer_id: customer.id, p_address_id: address.id,
      p_snapshot: { ...draft, discountDetails: result.discountDetails },
      p_items: result.rows.map(row => ({ description: row.description, fixed_price: row.price })) };
    const finalized = checked(await db.rpc('finalize_smart_estimate', args), 'Finalize');
    assert.deepEqual(checked(await db.rpc('finalize_smart_estimate', args), 'Retry'), finalized);
    const token = randomBytes(32).toString('hex');
    checked(await db.from('estimate_approval_links').insert({
      estimate_id: finalized.estimate_id, business_id: member.business_id, created_by: user.id,
      token_hash: createHash('sha256').update(token).digest('hex'),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    }), 'Approval link');
    const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } });
    checked(await anonymous.rpc('respond_customer_estimate', { p_token: token, p_response: response }), 'Customer decision');
    const decided = checked(await db.from('estimates').select('status')
      .eq('id', finalized.estimate_id).single(), 'Decision status');
    assert.equal(decided.status, response);
    const pdf = await fetch(`http://127.0.0.1:3015/estimates/smart/pdf?id=${saved.id}`, {
      headers: { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') },
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(pdf.status, 200, 'Authenticated PDF route');
    assert.match(pdf.headers.get('content-type'), /application\/pdf/);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.ok(bytes.length > 1000);
    console.log(`PASS save, reopen, idempotent finalization, ${response} decision, authenticated PDF download`);
  }
  console.log('QA fixtures retained for review in the isolated automation business.');
} finally {
  await db.auth.signOut({ scope: 'local' });
}

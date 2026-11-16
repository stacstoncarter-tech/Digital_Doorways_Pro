import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

// Only the isolated QA project is an allowed target for this write test.
const qaUrl = 'https://snsnhnovinjqpiwrqspe.supabase.co';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, qaUrl, 'QA database required');
assert.equal(process.env.POWER_CLEAN_QA_EMAIL, 'power-clean-automation@example.invalid');
assert.ok(process.env.POWER_CLEAN_QA_PASSWORD, 'QA password is required');
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'QA publishable key is required');

const db = createClient(qaUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let businessId;

function requireSuccess(result, label) {
  // Provider responses may contain tokens. Only report the test step on failure.
  if (result.error) throw new Error(label + ' failed');
  return result.data;
}

try {
  const { user } = requireSuccess(await db.auth.signInWithPassword({
    email: process.env.POWER_CLEAN_QA_EMAIL,
    password: process.env.POWER_CLEAN_QA_PASSWORD,
  }), 'Password sign-in');
  assert.ok(user?.id, 'Authenticated user required');
  console.log('PASS password sign-in');

  const refreshed = requireSuccess(await db.auth.refreshSession(), 'Session refresh');
  assert.equal(refreshed.user.id, user.id);
  console.log('PASS session refresh');

  const member = requireSuccess(await db.from('business_members')
    .select('business_id,role').eq('user_id', user.id).single(), 'QA membership');
  assert.equal(member.role, 'staff');
  businessId = member.business_id;
  const business = requireSuccess(await db.from('businesses')
    .select('name').eq('id', businessId).single(), 'QA business');
  assert.equal(business.name, 'Power Clean Automation QA');

  const customers = requireSuccess(await db.from('customers')
    .select('id,business_id'), 'Authenticated customer read');
  assert.ok(customers.every(row => row.business_id === businessId));
  console.log('PASS authenticated customer read');

  const visible = requireSuccess(await db.from('business_members')
    .select('business_id'), 'Business isolation');
  assert.ok(visible.every(row => row.business_id === businessId));
  console.log('PASS business isolation');
} finally {
  requireSuccess(await db.auth.signOut({ scope: 'local' }), 'Close test session');
}

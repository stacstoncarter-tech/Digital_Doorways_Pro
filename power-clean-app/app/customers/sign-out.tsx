'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export default function SignOut() {
  const [busy,setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      const {error} = await createClient().auth.signOut();
      if (error) throw error;
      window.location.assign('/login');
    } catch {
      setBusy(false);
      alert('Sign out failed. Please try again.');
    }
  }
  return <button className="secondary" type="button" disabled={busy} onClick={signOut}>{busy?'Signing out…':'Sign out'}</button>;
}

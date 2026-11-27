'use client';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function signIn(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      window.location.assign('/customers');
    } catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed'); }
    finally { setLoading(false); }
  }
  return <main style={{maxWidth:420,margin:'10vh auto',padding:24}}>
    <h1>Power Clean</h1><p>Sign in to your secure workspace.</p>
    <form onSubmit={signIn} style={{display:'grid',gap:16}}>
      <label>Email<input style={{display:'block',width:'100%',padding:12}} type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Password<input style={{display:'block',width:'100%',padding:12}} type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error && <p role="alert">{error}</p>}
      <button className="primary" disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
    </form>
    <p style={{fontSize:13}}>Accounts must be provisioned by an administrator. Public sign-up is not enabled.</p>
  </main>;
}

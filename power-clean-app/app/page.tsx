import { redirect } from 'next/navigation';

// The CRM is the default workspace; no misleading in-memory customer preview.
export default function Home() {
  redirect('/customers');
}

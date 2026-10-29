import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Power Clean | Operations', description: 'Power Clean business operations workspace' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

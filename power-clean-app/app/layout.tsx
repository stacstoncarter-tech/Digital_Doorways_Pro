import type { Metadata } from 'next';
import './globals.css';
import GlobalNavigation from './global-navigation';
import {POWER_CLEAN_LOGO} from '@/lib/branding';
export const metadata: Metadata = { title: 'Power Clean | Operations', description: 'Power Clean business operations workspace', icons: {icon: POWER_CLEAN_LOGO, apple: POWER_CLEAN_LOGO} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><GlobalNavigation/>{children}</body></html>; }

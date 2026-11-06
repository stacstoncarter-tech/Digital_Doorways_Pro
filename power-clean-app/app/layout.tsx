import type { Metadata } from 'next';
import './globals.css';
import GlobalNavigation from './global-navigation';
export const metadata: Metadata = { title: 'Power Clean | Operations', description: 'Power Clean business operations workspace', icons: {icon: [{url:'/power-clean-emblem.svg',type:'image/svg+xml'}], shortcut:'/power-clean-emblem.svg', apple:'/power-clean-emblem.svg'} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><GlobalNavigation/>{children}</body></html>; }

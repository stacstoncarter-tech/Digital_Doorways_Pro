import type { Metadata } from 'next';
import './globals.css';
import GlobalNavigation from './global-navigation';
export const metadata: Metadata = { metadataBase: new URL('https://power-clean-operations-stacstoncarter-5554.vercel.app'), title: 'Power Clean | Operations', description: 'Power Clean business operations workspace', openGraph: {siteName:'Power Clean',title:'Power Clean | Customer Agreements',description:'Review and electronically sign your Power Clean agreements.',type:'website',images:[{url:'/og-image?v=3',width:110,height:112,alt:'Power Clean emblem'}]},twitter:{card:'summary',title:'Power Clean | Customer Agreements',images:['/og-image?v=3']}, icons: {icon: [{url:'/power-clean-emblem.svg',type:'image/svg+xml'}], shortcut:'/power-clean-emblem.svg', apple:'/power-clean-emblem.svg'} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><GlobalNavigation/>{children}</body></html>; }

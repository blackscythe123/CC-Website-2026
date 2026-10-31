import type {Metadata} from 'next';
import {VerticalNavbar} from '@coding-club/scrapbook-ui';
import portalConfig from '../../portal.config.json';
import './globals.css';
import '@coding-club/scrapbook-ui/scrapbook.css';
import '@coding-club/scrapbook-ui/responsive.css';
import '@coding-club/scrapbook-ui/vertical-portal.css';
export const metadata:Metadata={title:`${portalConfig.name} | SSN Coding Club`,description:portalConfig.description};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><VerticalNavbar name={portalConfig.name} slug={portalConfig.verticalSlug}/><main>{children}</main><footer className="vertical-footer">SSN Coding Club · {portalConfig.name}</footer></body></html>}

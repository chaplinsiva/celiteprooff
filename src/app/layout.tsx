import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'CelitePro - Premium Video Templates',
    description: 'Create stunning videos with our professional templates. Customize text, colors, and media with ease.',
    keywords: ['video templates', 'motion graphics', 'video editing', 'CelitePro'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
            </body>
        </html>
    );
}

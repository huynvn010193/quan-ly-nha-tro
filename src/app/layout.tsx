import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'vietnamese'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Nhà Trọ Tam Ke — Quản lý nhà trọ',
  description: 'Ứng dụng quản lý phòng trọ, người thuê, hóa đơn và thu chi.'
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='vi' className={manrope.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import { Inter, Lora } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import RegisterSW from '@/components/pwa/RegisterSW';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import NotificationSetup from '@/components/pwa/NotificationSetup';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#101828" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/images/logo/app-icon.png" />
      </head>
      <body className={`${inter.variable} ${lora.variable} font-sans`}>
        <ThemeProvider>
          <SidebarProvider>
            {children}
            <RegisterSW />
            <InstallPrompt />
            {/* Notification setup: request permission and obtain FCM token */}
            <NotificationSetup />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

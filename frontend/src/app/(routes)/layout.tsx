'use client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/app/themes/MainTheme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/AdminSidebar';
import { useState, useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.log('isMobile:', isMobile);

  return (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />

        <div style={{ display: 'flex' }}>
          <AdminSidebar />
          <div
            style={{
              marginLeft: 240, 
              flexGrow: 1,
            }}
          >
            <main
              style={{
                paddingTop: '110px', 
                paddingLeft: '32px',
                paddingRight: '32px',
                paddingBottom: '32px',
                backgroundColor: '#f9fafb',
                minHeight: '100vh',
              }}
            >
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </ThemeProvider>
  );
}
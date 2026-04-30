'use client';
import { CssBaseline, ThemeProvider, Box, CircularProgress } from '@mui/material';
import theme from '@/app/themes/MainTheme';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminSidebar from '@/components/AdminSidebar';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/authService';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked] = useState(() => isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  if (!authChecked) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

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
'use client';

import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import theme from '@/app/themes/MainTheme';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/public/PublicHeader';

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <PublicHeader />
        <Box
          component="main"
          sx={{
            flex: 1,
            width: '100%',
          }}
        >
          {children}
        </Box>
        <Footer />
      </Box>
    </ThemeProvider>
  );
}

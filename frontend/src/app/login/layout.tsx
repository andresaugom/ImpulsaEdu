'use client';

import { CssBaseline, ThemeProvider, Box } from '@mui/material';
import theme from '@/app/themes/MainTheme';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}

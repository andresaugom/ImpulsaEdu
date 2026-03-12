'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/app/themes/MainTheme';

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="es">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

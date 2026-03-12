'use client';

import { createTheme, responsiveFontSizes } from '@mui/material';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

let MainTheme = createTheme({
  palette: {
    primary: {
      main: '#1E3A8A', // Azul Rey
    },
    secondary: {
      main: '#f50057', // Color de acento
    },
    background: {
      default: '#ffffff', // Fondo base
      paper: '#f8f9fa', // Fondo de tarjetas o modales
    },
    text: {
      primary: '#111827', // Color oscuro
      secondary: '#374151', // Color gris
    },
  },
  typography: {
    fontFamily: inter.style.fontFamily, // Usar Inter como fuente base
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 600, fontSize: '1.5rem' },
    body1: { fontSize: '1rem' },
  },
});

MainTheme = responsiveFontSizes(MainTheme);

export default MainTheme;
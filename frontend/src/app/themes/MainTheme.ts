'use client';

import { createTheme, responsiveFontSizes } from '@mui/material';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });

let MainTheme = createTheme({
  palette: {
    primary: {
      main: '#009933', // Brand Green
      light: '#33b366',
      dark: '#006622',
    },
    secondary: {
      main: '#ec671b', // Orange
      light: '#f08844',
      dark: '#c45110',
    },
    info: {
      main: '#f4981c', // Yellow
      light: '#f7ac47',
      dark: '#d17a14',
    },
    warning: {
      main: '#f4981c', // Yellow (for alerts)
      light: '#f7ac47',
    },
    error: {
      main: '#9c3a0b', // Darker orange (for errors)
      light: '#c45110',
    },
    success: {
      main: '#009933', // Green (for success)
      light: '#33b366',
    },
    divider: '#1c3661', // Dark blue for dividers
    background: {
      default: '#ffffff', // Base background
      paper: '#f8fafb', // Card/modal background
    },
    text: {
      primary: '#1c3661', // Dark blue
      secondary: '#4a5f8f', // Medium blue-gray
      disabled: '#a0afc9', // Light blue-gray
    },
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    h1: { fontWeight: 700, fontSize: '2rem', color: '#1c3661' },
    h2: { fontWeight: 600, fontSize: '1.5rem', color: '#1c3661' },
    h3: { fontWeight: 600, fontSize: '1.25rem', color: '#1c3661' },
    body1: { fontSize: '1rem', color: '#1c3661' },
    body2: { fontSize: '0.875rem', color: '#4a5f8f' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: '#009933',
          '&:hover': {
            backgroundColor: '#006622',
          },
        },
      },
    },
  },
});

MainTheme = responsiveFontSizes(MainTheme);

export default MainTheme;
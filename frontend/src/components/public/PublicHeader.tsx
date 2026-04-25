'use client';

import {
  AppBar,
  Toolbar,
  Box,
  Button,
 
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';

export default function PublicHeader() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: '#ffffff',
        color: '#1f2937',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '12px 16px' : '0 24px',
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 700,
            fontSize: '24px',
            color: '#009933',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          component="div"
        >
          ImpulsaEdu
        </Box>

        {/* Navigation */}
        <Box
          sx={{
            display: 'flex',
            gap: isMobile ? '12px' : '20px',
            alignItems: 'center',
            marginLeft: 'auto',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}
        >
          <Button
            color="inherit"
            sx={{
              textTransform: 'none',
              fontSize: isMobile ? '0.875rem' : '0.95rem',
              whiteSpace: 'nowrap',
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
            href="#about"
          >
            Cómo Funciona
          </Button>
          <Button
            color="inherit"
            sx={{
              textTransform: 'none',
              fontSize: isMobile ? '0.875rem' : '0.95rem',
              whiteSpace: 'nowrap',
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
            href="#schools"
          >
            Escuelas
          </Button>
          <Button
            color="inherit"
            sx={{
              textTransform: 'none',
              fontSize: isMobile ? '0.875rem' : '0.95rem',
              whiteSpace: 'nowrap',
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
            href="#contact"
          >
            Contacto
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{
              textTransform: 'none',
              fontSize: isMobile ? '0.875rem' : '0.95rem',
              whiteSpace: 'nowrap',
              padding: isMobile ? '6px 12px' : '8px 16px',
            }}
            href="/login"
          >
            Iniciar Sesión
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

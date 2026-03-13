
'use client';
import { AppBar, Toolbar, Typography, Box, IconButton, Button, Stack } from '@mui/material';
import Image from 'next/image';
import {
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ImpulsaLogo = '/ImpulsaEduLogoRevised.png';

const Header = () => {
  const router = useRouter();


  const goSettings = () => {
    router.push('/ajustes');
  }
  
  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          position: 'relative',
          justifyContent: 'center',
          paddingY: 2.5,
          minHeight: '96px',
        }}
      >

        <Box
          sx={{
            position: 'absolute',
            left: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Image
            src={ImpulsaLogo}
            alt="Nulen Logo"
            width={160}
            height={90}
            style={{ objectFit: 'contain' }}
          />
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
            textAlign: 'center',
            color: '#009933',
          }}
        >
          ImpulsaEdu
        </Typography>


        <Box
          sx={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              size="small"
              startIcon={<Logout />}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                paddingX: 2,
                paddingY: 1,
                backgroundColor: '#009933',
                color: 'white',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                '&:hover': {
                  backgroundColor: '#006622',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              Cerrar sesión
            </Button>

            <IconButton
              aria-label="Profile"
              onClick={goSettings}
              sx={{
                color: '#009933',
                padding: 0.5,
                '&:hover': {
                  backgroundColor: 'transparent',
                },
              }}
            >
              <AccountCircle fontSize="large" />
            </IconButton>
          </Stack>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
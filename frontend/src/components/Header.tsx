
'use client';
import { AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem as MuiMenuItem, ListItemIcon, ListItemText } from '@mui/material';
import Image from 'next/image';
import {
  AccountCircle,
  Logout,
  ManageAccounts,
} from '@mui/icons-material';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/authService';

const ImpulsaLogo = '/ImpulsaEduLogoRevised.png';

const Header = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleManageAccount = () => {
    handleCloseMenu();
    router.push('/preferencias');
  };

  const handleLogout = async () => {
    handleCloseMenu();
    await logout();
    router.push('/login');
  };

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
          <IconButton
            aria-label="Cuenta"
            onClick={handleOpenMenu}
            sx={{
              color: '#009933',
              padding: 0.5,
              '&:hover': { backgroundColor: 'rgba(0, 153, 51, 0.08)' },
            }}
          >
            <AccountCircle sx={{ fontSize: 40 }} />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { elevation: 3, sx: { mt: 1, minWidth: 200 } } }}
          >
            <MuiMenuItem onClick={handleManageAccount}>
              <ListItemIcon><ManageAccounts fontSize="small" /></ListItemIcon>
              <ListItemText>Administrar cuenta</ListItemText>
            </MuiMenuItem>
            <MuiMenuItem onClick={handleLogout}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
              <ListItemText>Cerrar sesión</ListItemText>
            </MuiMenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

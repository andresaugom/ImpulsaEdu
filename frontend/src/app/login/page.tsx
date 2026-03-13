'use client';

import {
  Box,
  Container,
  Card,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login:', { email, password, remember });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #009933 0%, #006622 100%)',
        padding: '20px',
      }}
    >
      <Card
        sx={{
          backgroundColor: 'white',
          padding: isMobile ? '20px' : '40px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          width: '100%',
          maxWidth: '420px',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            textAlign: 'center',
            marginBottom: '30px',
            fontSize: '28px',
            fontWeight: 700,
            color: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60px',
          }}
        >
          ImpulsaEdu
        </Box>

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ marginBottom: '20px' }}>
            <Typography
              component="label"
              htmlFor="email"
              sx={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#1f2937',
                fontSize: '14px',
              }}
            >
              Correo Electrónico
            </Typography>
            <TextField
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '14px',
                },
              }}
            />
          </Box>

          <Box sx={{ marginBottom: '20px' }}>
            <Typography
              component="label"
              htmlFor="password"
              sx={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: '#1f2937',
                fontSize: '14px',
              }}
            >
              Contraseña
            </Typography>
            <TextField
              id="password"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '14px',
                },
              }}
            />
          </Box>

          <Box sx={{ marginBottom: '20px' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: '14px' }}>Recuérdame</Typography>
              }
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            Iniciar Sesión
          </Button>
        </Box>

        {/* Footer Text */}
        <Box
          sx={{
            textAlign: 'center',
            marginTop: '20px',
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          ¿No tienes una cuenta?{' '}
          <Link
            href="#"
            sx={{
              color: theme.palette.primary.main,
              textDecoration: 'none',
              fontWeight: 600,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Contacta a tu administrador
          </Link>
        </Box>
      </Card>
    </Box>
  );
}

'use client';

/**
 * Login page – Endpoint 1: POST /auth/login
 *
 * Submits credentials to the auth service and stores the returned
 * access + refresh tokens in localStorage via authService.login().
 * Redirects to the dashboard on success; shows an inline error on failure.
 */

import {
  Box,
 
  Card,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Link,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/authService';
import { ApiError } from '@/lib/apiClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // POST /auth/login — stores accessToken + refreshToken in localStorage
      await login(email, password);
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Correo o contraseña incorrectos. Inténtalo de nuevo.');
      } else {
        setError('No se pudo conectar con el servidor. Inténtalo más tarde.');
      }
    } finally {
      setLoading(false);
    }
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

        {/* Error banner */}
        {error && (
          <Alert severity="error" sx={{ marginBottom: '20px' }}>
            {error}
          </Alert>
        )}

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
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px' } }}
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
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '14px' } }}
            />
          </Box>

          <Box sx={{ marginBottom: '20px' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  size="small"
                  disabled={loading}
                />
              }
              label={<Typography sx={{ fontSize: '14px' }}>Recuérdame</Typography>}
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              marginBottom: '10px',
            }}
          >
            {loading ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Iniciar Sesión'
            )}
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
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Contacta a tu administrador
          </Link>
        </Box>
      </Card>
    </Box>
  );
}

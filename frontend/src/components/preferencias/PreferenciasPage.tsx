'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormGroup,
  Chip,
} from '@mui/material';
import { useState } from 'react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PreferenciasPage() {
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState({
    fullName: 'Juan Mockup',
    email: 'juan@impulsaedu.com',
    phone: '+52 (33) 5555-1234',
    organization: 'ImpulsaEdu',
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    donationUpdates: true,
    schoolUpdates: true,
    weeklyReport: false,
    monthlyReport: true,
  });
  const [preferences, setPreferences] = useState({
    language: 'es',
    timezone: 'America/Mexico_City',
    theme: 'light',
    dataCollection: true,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const handleNotificationChange = (field: string) => {
    setNotifications({
      ...notifications,
      [field]: !notifications[field as keyof typeof notifications],
    });
  };

  const handlePreferenceChange = (field: string, value: string | boolean) => {
    setPreferences({ ...preferences, [field]: value });
  };

  const handleSaveProfile = () => {
    console.log('Saving profile:', profileData);
    // API call would happen here
  };

  const handleSaveNotifications = () => {
    console.log('Saving notifications:', notifications);
    // API call would happen here
  };

  const handleSavePreferences = () => {
    console.log('Saving preferences:', preferences);
    // API call would happen here
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, marginBottom: 1 }}>
          Configuración de Cuenta
        </Typography>
        <Typography sx={{ color: '#6b7280' }}>
          Administra tus preferencias personales y configuración del sistema
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            borderBottom: '2px solid #e5e7eb',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              color: '#6b7280',
              '&.Mui-selected': {
                color: '#1f2937',
              },
            },
          }}
        >
          <Tab label="Perfil" />
          <Tab label="Notificaciones" />
          <Tab label="Preferencias del Sistema" />
          <Tab label="Ayuda" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ padding: 3, maxWidth: '600px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 2 }}>
              Información del Perfil
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 3 }}>
              <TextField
                fullWidth
                label="Nombre Completo"
                value={profileData.fullName}
                onChange={(e) => handleProfileChange('fullName', e.target.value)}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Correo Electrónico"
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Número de Teléfono"
                value={profileData.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Organización"
                value={profileData.organization}
                onChange={(e) => handleProfileChange('organization', e.target.value)}
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary" onClick={handleSaveProfile}>
                Guardar Cambios
              </Button>
              <Button variant="outlined" color="primary">
                Cambiar Contraseña
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ padding: 3, maxWidth: '600px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 2 }}>
              Preferencias de Notificaciones
            </Typography>

            <FormGroup sx={{ marginBottom: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.emailNotifications}
                    onChange={() => handleNotificationChange('emailNotifications')}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      Notificaciones por Correo Electrónico
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Recibe alertas sobre actividades importantes
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.donationUpdates}
                    onChange={() => handleNotificationChange('donationUpdates')}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      Actualizaciones de Donaciones
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Notificaciones cuando hay cambios en donaciones
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.schoolUpdates}
                    onChange={() => handleNotificationChange('schoolUpdates')}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      Actualizaciones de Escuelas
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Notificaciones sobre cambios en escuelas
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.weeklyReport}
                    onChange={() => handleNotificationChange('weeklyReport')}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Reporte Semanal</Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Recibe un resumen semanal de actividades
                    </Typography>
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.monthlyReport}
                    onChange={() => handleNotificationChange('monthlyReport')}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Reporte Mensual</Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Recibe un resumen mensual de actividades
                    </Typography>
                  </Box>
                }
              />
            </FormGroup>

            <Button variant="contained" color="primary" onClick={handleSaveNotifications}>
              Guardar Cambios
            </Button>
          </Box>
        </TabPanel>

        {/* System Preferences Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ padding: 3, maxWidth: '600px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 2 }}>
              Preferencias del Sistema
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 3 }}>
              <TextField
                fullWidth
                label="Idioma"
                select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                variant="outlined"
              >
                <MenuItem value="es">Español (México)</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Zona Horaria"
                select
                value={preferences.timezone}
                onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                variant="outlined"
              >
                <MenuItem value="America/Mexico_City">Hora de México (CDMX)</MenuItem>
                <MenuItem value="America/Chicago">Hora Central</MenuItem>
                <MenuItem value="America/Denver">Hora de las Montañas</MenuItem>
                <MenuItem value="America/Los_Angeles">Hora del Pacífico</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Tema"
                select
                value={preferences.theme}
                onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                variant="outlined"
              >
                <MenuItem value="light">Claro</MenuItem>
                <MenuItem value="dark">Oscuro</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.dataCollection}
                    onChange={(e) => handlePreferenceChange('dataCollection', e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Permitir Recopilación de Datos</Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Ayúdanos a mejorar compartiendo datos anónimos de uso
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Button variant="contained" color="primary" onClick={handleSavePreferences}>
              Guardar Cambios
            </Button>
          </Box>
        </TabPanel>

        {/* Help Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ padding: 3, maxWidth: '600px' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 2 }}>
              Ayuda y Soporte
            </Typography>

            <Paper
              sx={{
                padding: 2,
                marginBottom: 2,
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
              }}
            >
              <Typography sx={{ fontWeight: 600, marginBottom: 1 }}>
                Preguntas Frecuentes (FAQ)
              </Typography>
              <Typography sx={{ color: '#6b7280', marginBottom: 2 }}>
                Consulta nuestras preguntas frecuentes para obtener respuestas rápidas a preguntas
                comunes.
              </Typography>
              <Button variant="outlined" color="primary">
                Ver FAQ
              </Button>
            </Paper>

            <Paper
              sx={{
                padding: 2,
                marginBottom: 2,
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
              }}
            >
              <Typography sx={{ fontWeight: 600, marginBottom: 1 }}>
                Documentación
              </Typography>
              <Typography sx={{ color: '#6b7280', marginBottom: 2 }}>
                Lee nuestra documentación completa para entender todas las características de
                ImpulsaEdu.
              </Typography>
              <Button variant="outlined" color="primary">
                Acceder a Documentación
              </Button>
            </Paper>

            <Paper
              sx={{
                padding: 2,
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
              }}
            >
              <Typography sx={{ fontWeight: 600, marginBottom: 1 }}>
                Contacto de Soporte
              </Typography>
              <Typography sx={{ color: '#6b7280', marginBottom: 1 }}>
                Si tienes problemas o preguntas, contacta a nuestro equipo de soporte:
              </Typography>
              <Box sx={{ marginBottom: 2 }}>
                <Typography sx={{ color: '#1f2937' }}>Email: soporte@impulsaedu.com</Typography>
                <Typography sx={{ color: '#1f2937' }}>Teléfono: +52 (33) 1234-5678</Typography>
              </Box>
              <Button variant="contained" color="primary">
                Enviar Mensaje de Soporte
              </Button>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
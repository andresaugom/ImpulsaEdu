'use client';

import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Link from 'next/link';

// Mock data for schools
const mockSchools = [
  {
    id: 1,
    name: 'Escuela Primaria A',
    region: 'Guadalajara',
    status: 'Activa',
    progress: 65,
    statusColor: 'success',
  },
  {
    id: 2,
    name: 'Escuela Secundaria B',
    region: 'Zapopan',
    status: 'En Progreso',
    progress: 45,
    statusColor: 'warning',
  },
  {
    id: 3,
    name: 'Escuela Pública C',
    region: 'Tlaquepaque',
    status: 'Completada',
    progress: 100,
    statusColor: 'success',
  },
];

// Mock data for donations
const mockDonations = [
  {
    id: '#DON-001',
    donor: 'Corporativo Educativo Jalisco',
    school: 'Escuela Primaria A',
    type: 'Material',
    status: 'En Transporte',
    value: '$1,500',
  },
  {
    id: '#DON-002',
    donor: 'Fundación México Solidario',
    school: 'Escuela Secundaria B',
    type: 'Monetaria',
    status: 'Aprobada',
    value: '$5,000',
  },
  {
    id: '#DON-003',
    donor: 'Asociación Educadores Unidos',
    school: 'Escuela Pública C',
    type: 'Material',
    status: 'Entregada',
    value: '$800',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Activa':
    case 'Aprobada':
    case 'Entregada':
      return '#d1fae5'; // Light green
    case 'En Progreso':
    case 'En Transporte':
      return '#ffe4cc'; // Light orange
    case 'Completada':
      return '#d1fae5'; // Light green
    default:
      return '#dbeafe'; // Light blue
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'Activa':
    case 'Aprobada':
    case 'Entregada':
      return '#004411'; // Dark green
    case 'En Progreso':
    case 'En Transporte':
      return '#9c3a0b'; // Dark orange
    case 'Completada':
      return '#004411'; // Dark green
    default:
      return '#0c2d6b'; // Dark blue
  }
};

export default function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ marginBottom: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            marginBottom: 1,
            color: '#1c3661',
          }}
        >
          Bienvenido, Juan
        </Typography>
        <Typography sx={{ color: '#4a5f8f' }}>
          Aquí tienes una descripción general de tus donaciones y escuelas
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid
        container
        spacing={3}
        sx={{
          marginBottom: 4,
        }}
      >
        {/* Schools Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1c3661',
                  }}
                >
                  Escuelas Activas
                </Typography>
                <Chip
                  label="En Progreso"
                  size="small"
                  sx={{
                    backgroundColor: '#66cc99',
                    color: '#004411',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ marginBottom: 1.5 }}>
                  <Typography sx={{ fontSize: '12px', color: '#4a5f8f' }}>
                    Escuelas Totales
                  </Typography>
                  <Typography
                    sx={{ fontSize: '18px', fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    12
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#4a5f8f' }}>
                    Financiadas Este Mes
                  </Typography>
                  <Typography
                    sx={{ fontSize: '18px', fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    3
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Link href="/escuelas" style={{ textDecoration: 'none', width: '100%' }}>
                <Button
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Gestionar Escuelas →
                </Button>
              </Link>
            </CardActions>
          </Card>
        </Grid>

        {/* Donors Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1c3661',
                  }}
                >
                  Donantes Activos
                </Typography>
                <Chip
                  label="Activo"
                  size="small"
                  sx={{
                    backgroundColor: '#d1fae5',
                    color: '#004411',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ marginBottom: 1.5 }}>
                  <Typography sx={{ fontSize: '12px', color: '#4a5f8f' }}>
                    Total de Donantes
                  </Typography>
                  <Typography
                    sx={{ fontSize: '18px', fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    8
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#4a5f8f' }}>
                    Nuevos Este Mes
                  </Typography>
                  <Typography
                    sx={{ fontSize: '18px', fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    5
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Link href="/donantes" style={{ textDecoration: 'none', width: '100%' }}>
                <Button
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Gestionar Donantes →
                </Button>
              </Link>
            </CardActions>
          </Card>
        </Grid>

        {/* Donations Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1c3661',
                  }}
                >
                  Donaciones Activas
                </Typography>
                <Chip
                  label="En Progreso"
                  size="small"
                  sx={{
                    backgroundColor: '#f7ac47',
                    color: '#9c3a0b',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ marginBottom: 1.5 }}>
                  <Typography sx={{ fontSize: '12px', color: '#4a5f8f' }}>
                    Donaciones Totales
                  </Typography>
                  <Typography
                    sx={{ fontSize: '18px', fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    45
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '12px', color: '#4a5f8f' }}>
                    Pendientes de Entrega
                  </Typography>
                  <Typography
                    sx={{ fontSize: '18px', fontWeight: 700, color: theme.palette.primary.main }}
                  >
                    8
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Link href="/donaciones" style={{ textDecoration: 'none', width: '100%' }}>
                <Button
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '12px',
                  }}
                >
                  Gestionar Donaciones →
                </Button>
              </Link>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Schools Section */}
      <Box sx={{ marginBottom: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#1c3661',
            }}
          >
            Escuelas Recientes
          </Typography>
          <Link href="/escuelas" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="small">
              Ver Todo
            </Button>
          </Link>
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafb' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Nombre de la Escuela
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Región
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Estado
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Progreso
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockSchools.map((school) => (
                <TableRow
                  key={school.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8fafb',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{school.name}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f', fontSize: '14px' }}>{school.region}</TableCell>
                  <TableCell>
                    <Chip
                      label={school.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(school.status),
                        color: getStatusTextColor(school.status),
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: '150px' }}>
                    <LinearProgress
                      variant="determinate"
                      value={school.progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#10b981',
                          borderRadius: 4,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: theme.palette.primary.main, fontSize: '12px' }}>
                    <Link href="#" style={{ textDecoration: 'none', color: 'inherit' }}>
                      Ver →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Recent Donations Section */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#1c3661',
            }}
          >
            Donaciones Recientes
          </Typography>
          <Link href="/donaciones" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="small">
              Ver Todo
            </Button>
          </Link>
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafb' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  ID de Donación
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Donante
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Escuela
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Tipo
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Estado
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Valor
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockDonations.map((donation) => (
                <TableRow
                  key={donation.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8fafb',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{donation.id}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f', fontSize: '14px' }}>
                    {donation.donor}
                  </TableCell>
                  <TableCell sx={{ color: '#4a5f8f', fontSize: '14px' }}>
                    {donation.school}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={donation.type}
                      size="small"
                      sx={{
                        backgroundColor: '#dbeafe',
                        color: '#0c2d6b',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={donation.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(donation.status),
                        color: getStatusTextColor(donation.status),
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    />
                  </TableCell>
                  <TableCell>{donation.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

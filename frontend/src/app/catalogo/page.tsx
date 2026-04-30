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
  TextField,
  Select,
  MenuItem,
  LinearProgress,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { ApiSchool, fetchSchools } from '@/lib/schoolsService';
import SchoolImageCarousel from '@/components/public/SchoolImageCarousel';

export default function Catalogo() {
  const [schools, setSchools] = useState<ApiSchool[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [errorSchools, setErrorSchools] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    async function loadSchools() {
      try {
        setLoadingSchools(true);
        const result = await fetchSchools({ per_page: 100 });
        setSchools(result.schools);
      } catch {
        setErrorSchools('No se pudieron cargar las escuelas. Intenta de nuevo más tarde.');
      } finally {
        setLoadingSchools(false);
      }
    }
    loadSchools();
  }, []);

  const regions = Array.from(new Set(schools.map((s) => s.region))).sort();

  const filteredSchools = schools.filter((school) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      school.name.toLowerCase().includes(q) ||
      school.region.toLowerCase().includes(q) ||
      school.school.toLowerCase().includes(q);
    const matchesRegion = selectedRegion === 'all' || school.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #009933 0%, #006622 100%)',
          color: 'white',
          textAlign: 'center',
          padding: isMobile ? '60px 20px' : '80px 30px',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontWeight: 700,
              marginBottom: 2,
              fontSize: isMobile ? '1.8rem' : '2.5rem',
              color: '#F8FAFC',
            }}
          >
            Apoya a las Escuelas de Jalisco
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: isMobile ? '1rem' : '1.2rem',
              opacity: 0.95,
              maxWidth: 600,
              margin: '0 auto',
              color: '#F8FAFC',
            }}
          >
            Descubre cómo puedes contribuir al crecimiento educativo de nuestras comunidades
          </Typography>
        </Container>
      </Box>

      {/* Schools Section */}
      <Box
        id="schools"
        sx={{
          padding: isMobile ? '40px 20px' : '60px 30px',
          backgroundColor: '#ffffff',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              marginBottom: 4,
              color: '#1f2937',
            }}
          >
            Escuelas Disponibles
          </Typography>

          {/* Search and Filter */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              marginBottom: 4,
              flexWrap: 'wrap',
            }}
          >
            <TextField
              placeholder="Buscar escuelas..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 200,
                backgroundColor: 'white',
              }}
            />
            <Select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              size="small"
              sx={{
                minWidth: 200,
                backgroundColor: 'white',
              }}
            >
              <MenuItem value="all">Filtrar por Región</MenuItem>
              {regions.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Loading state */}
          {loadingSchools && (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: 6 }}>
              <CircularProgress color="primary" />
            </Box>
          )}

          {/* Error state */}
          {errorSchools && (
            <Alert severity="error" sx={{ marginBottom: 3 }}>
              {errorSchools}
            </Alert>
          )}

          {/* Schools Grid */}
          {!loadingSchools && !errorSchools && (
            <Grid container spacing={3}>
              {filteredSchools.map((school) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={school.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    {/* Image carousel at the top of the card */}
                    <SchoolImageCarousel cct={school.cct} />

                    <CardContent sx={{ flexGrow: 1, paddingBottom: 1 }}>
                      <Box
                        sx={{
                          paddingBottom: 2,
                          borderBottom: '1px solid #e5e7eb',
                          marginBottom: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          component="h3"
                          sx={{
                            fontWeight: 600,
                            color: '#1f2937',
                            marginBottom: 0.5,
                          }}
                        >
                          {school.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#6b7280',
                            fontSize: '0.9rem',
                          }}
                        >
                          {school.region}
                        </Typography>
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          color: '#6b7280',
                          fontSize: '0.9rem',
                          marginBottom: 2,
                        }}
                      >
                        Estudiantes: {school.students}
                      </Typography>

                      {/* Funding Progress */}
                      <Box sx={{ marginBottom: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 1,
                            fontSize: '0.85rem',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: '#6b7280' }}
                          >
                            Progreso de Financiamiento
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: '#6b7280' }}
                          >
                            ${school.progress.toLocaleString()} / ${school.goal.toLocaleString()}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(school.progress_pct, 100)}
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
                      </Box>

                      {school.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.9rem',
                            color: '#6b7280',
                            marginTop: 2,
                          }}
                        >
                          {school.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ paddingTop: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Donar Ahora
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {!loadingSchools && !errorSchools && filteredSchools.length === 0 && (
            <Box sx={{ textAlign: 'center', padding: 4 }}>
              <Typography color="textSecondary">
                No se encontraron escuelas que coincidan con tu búsqueda.
              </Typography>
            </Box>
          )}
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box
        id="about"
        sx={{
          padding: isMobile ? '50px 20px' : '80px 30px',
          backgroundColor: '#f9fafb',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 5,
              color: '#1f2937',
            }}
          >
            Cómo Funciona ImpulsaEdu
          </Typography>

          <Grid container spacing={4} sx={{ marginTop: 2 }}>
            {[
              {
                number: '1️⃣',
                title: 'Explora',
                description:
                  'Navega por nuestras escuelas participantes y conoce sus necesidades específicas de financiamiento.',
              },
              {
                number: '2️⃣',
                title: 'Selecciona',
                description: 'Elige la escuela o proyecto que más te interese apoyar.',
              },
              {
                number: '3️⃣',
                title: 'Contribuye',
                description:
                  'Realiza tu donación de forma segura con varios métodos de pago disponibles.',
              },
              {
                number: '4️⃣',
                title: 'Impacta',
                description:
                  'Recibe actualizaciones sobre cómo tu donación está transformando la educación.',
              },
            ].map((step, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index} sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontSize: '2.5rem',
                    marginBottom: 2,
                  }}
                >
                  {step.number}
                </Typography>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    fontWeight: 600,
                    marginBottom: 1,
                    color: '#1f2937',
                  }}
                >
                  {step.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#6b7280',
                  }}
                >
                  {step.description}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Contact Section */}
      <Box
        id="contact"
        sx={{
          padding: isMobile ? '40px 20px' : '80px 30px',
          backgroundColor: '#ffffff',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: 4,
              color: '#1f2937',
            }}
          >
            Ponte en Contacto
          </Typography>

          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre"
              placeholder="Tu nombre completo"
              variant="outlined"
              fullWidth
              size="medium"
            />
            <TextField
              label="Correo Electrónico"
              placeholder="tu@ejemplo.com"
              type="email"
              variant="outlined"
              fullWidth
              size="medium"
            />
            <TextField
              label="Mensaje"
              placeholder="Escribe tu mensaje aquí..."
              multiline
              rows={5}
              variant="outlined"
              fullWidth
              size="medium"
            />
            <Button
              variant="contained"
              color="primary"
              size="large"
              type="submit"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Enviar Mensaje
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

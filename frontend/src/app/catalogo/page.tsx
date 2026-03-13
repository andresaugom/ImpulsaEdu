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
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';

interface School {
  id: number;
  name: string;
  location: string;
  students: number;
  fundingGoal: number;
  fundingRaised: number;
  description: string;
}

const mockSchools: School[] = [
  {
    id: 1,
    name: 'Escuela Primaria San José',
    location: 'Guadalajara, Jalisco',
    students: 245,
    fundingGoal: 5000,
    fundingRaised: 2500,
    description: 'Necesitamos recursos para mejorar infraestructura y tecnología educativa.',
  },
  {
    id: 2,
    name: 'Escuela Secundaria Morelos',
    location: 'Zapopan, Jalisco',
    students: 380,
    fundingGoal: 6000,
    fundingRaised: 4200,
    description: 'Apoya nuestros programas de laboratorio y equipamiento tecnológico.',
  },
  {
    id: 3,
    name: 'Escuela Técnica Regional',
    location: 'Tlaquepaque, Jalisco',
    students: 520,
    fundingGoal: 8000,
    fundingRaised: 3800,
    description: 'Ayuda a equipar nuestros talleres de formación técnica.',
  },
  {
    id: 4,
    name: 'Escuela Primaria Benito Juárez',
    location: 'Puerto Vallarta, Jalisco',
    students: 190,
    fundingGoal: 3500,
    fundingRaised: 1500,
    description: 'Contribuye a la renovación de infraestructura y mobiliario educativo.',
  },
  {
    id: 5,
    name: 'Escuela Rural Las Montañas',
    location: 'Tonalá, Jalisco',
    students: 120,
    fundingGoal: 2500,
    fundingRaised: 800,
    description: 'Apoya a una comunidad rural con recursos educativos esenciales.',
  },
];

export default function Catalogo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const filteredSchools = mockSchools.filter((school) => {
    const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || school.location.includes(selectedRegion);
    return matchesSearch && matchesRegion;
  });

  const fundingPercentage = (raised: number, goal: number) => {
    return Math.round((raised / goal) * 100);
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
          color: 'white',
          textAlign: 'center',
          padding: isMobile ? '60px 20px' : '80px 30px',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              marginBottom: 2,
              fontSize: isMobile ? '1.8rem' : '2.5rem',
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
              <MenuItem value="Guadalajara">Guadalajara</MenuItem>
              <MenuItem value="Puerto Vallarta">Puerto Vallarta</MenuItem>
              <MenuItem value="Zapopan">Zapopan</MenuItem>
              <MenuItem value="Tlaquepaque">Tlaquepaque</MenuItem>
              <MenuItem value="Tonalá">Tonalá</MenuItem>
            </Select>
          </Box>

          {/* Schools Grid */}
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
                        {school.location}
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
                          ${school.fundingRaised} / ${school.fundingGoal}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={fundingPercentage(school.fundingRaised, school.fundingGoal)}
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

          {filteredSchools.length === 0 && (
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

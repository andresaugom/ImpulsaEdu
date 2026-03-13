'use client';

import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import Link from 'next/link';

interface School {
  id: number;
  name: string;
  region: string;
  category: string;
  status: 'active' | 'completed' | 'archived';
  fundingGoal: number;
  fundingCurrent: number;
}

const mockSchools: School[] = [
  {
    id: 1,
    name: 'Escuela Primaria A',
    region: 'Guadalajara',
    category: 'Infraestructura',
    status: 'active',
    fundingGoal: 10000,
    fundingCurrent: 6500,
  },
  {
    id: 2,
    name: 'Escuela Secundaria B',
    region: 'Puerto Vallarta',
    category: 'Materiales Educativos',
    status: 'active',
    fundingGoal: 15000,
    fundingCurrent: 7200,
  },
  {
    id: 3,
    name: 'Escuela Pública C',
    region: 'Zapopan',
    category: 'Tecnología',
    status: 'completed',
    fundingGoal: 12000,
    fundingCurrent: 12000,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return { bg: '#d1fae5', text: '#065f46', label: 'Activa' };
    case 'completed':
      return { bg: '#d1fae5', text: '#065f46', label: 'Completada' };
    case 'archived':
      return { bg: '#fee2e2', text: '#7f1d1d', label: 'Archivada' };
    default:
      return { bg: '#dbeafe', text: '#0c2d6b', label: 'Desconocida' };
  }
};

export default function EscuelasPage() {
  const theme = useTheme();
  const [schools, setSchools] = useState<School[]>(mockSchools);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    category: '',
    fundingGoal: '',
  });

  const filteredSchools = schools.filter((school) => {
    const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !regionFilter || school.region === regionFilter;
    const matchesStatus = !statusFilter || school.status === statusFilter;
    return matchesSearch && matchesRegion && matchesStatus;
  });

  const fundingPercentage = (current: number, goal: number) => {
    return Math.round((current / goal) * 100);
  };

  const handleOpenDialog = (school?: School) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name,
        region: school.region,
        category: school.category,
        fundingGoal: school.fundingGoal.toString(),
      });
    } else {
      setEditingSchool(null);
      setFormData({
        name: '',
        region: '',
        category: '',
        fundingGoal: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchool(null);
  };

  const handleSaveSchool = () => {
    if (editingSchool) {
      setSchools(
        schools.map((s) =>
          s.id === editingSchool.id
            ? {
                ...s,
                name: formData.name,
                region: formData.region,
                category: formData.category,
                fundingGoal: parseInt(formData.fundingGoal),
              }
            : s
        )
      );
    } else {
      const newSchool: School = {
        id: Math.max(...schools.map((s) => s.id)) + 1,
        name: formData.name,
        region: formData.region,
        category: formData.category,
        status: 'active',
        fundingGoal: parseInt(formData.fundingGoal),
        fundingCurrent: 0,
      };
      setSchools([...schools, newSchool]);
    }
    handleCloseDialog();
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Registro de Escuelas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none' }}
        >
          + Agregar Escuela
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper
        sx={{
          padding: 2,
          marginBottom: 3,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Nombre de la Escuela"
              placeholder="Buscar escuelas..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="">Todas las Regiones</MenuItem>
              <MenuItem value="Guadalajara">Guadalajara</MenuItem>
              <MenuItem value="Puerto Vallarta">Puerto Vallarta</MenuItem>
              <MenuItem value="Zapopan">Zapopan</MenuItem>
              <MenuItem value="Tlaquepaque">Tlaquepaque</MenuItem>
              <MenuItem value="Tonalá">Tonalá</MenuItem>
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="">Todos los Estados</MenuItem>
              <MenuItem value="active">Activa</MenuItem>
              <MenuItem value="completed">Completada</MenuItem>
              <MenuItem value="archived">Archivada</MenuItem>
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{ flex: 1, textTransform: 'none' }}
              >
                Buscar
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                sx={{ flex: 1, textTransform: 'none' }}
                onClick={() => {
                  setSearchQuery('');
                  setRegionFilter('');
                  setStatusFilter('');
                }}
              >
                Limpiar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Schools Table */}
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
                Categoría
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Estado
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Meta
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Actual
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Progreso
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSchools.map((school) => {
              const progress = fundingPercentage(school.fundingCurrent, school.fundingGoal);
              const statusColor = getStatusColor(school.status);
              return (
                <TableRow
                  key={school.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8fafb',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{school.name}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{school.region}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{school.category}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusColor.label}
                      size="small"
                      sx={{
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>${school.fundingGoal.toLocaleString()}</TableCell>
                  <TableCell>${school.fundingCurrent.toLocaleString()}</TableCell>
                  <TableCell sx={{ width: '120px' }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e0e7ff',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: progress > 75 ? '#009933' : '#f4981c',
                          borderRadius: 4,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleOpenDialog(school)}
                        sx={{ textTransform: 'none' }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{ textTransform: 'none' }}
                      >
                        Eliminar
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>
          {editingSchool ? 'Editar Escuela' : 'Agregar Nueva Escuela'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre de la Escuela"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Región"
              select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            >
              <MenuItem value="Guadalajara">Guadalajara</MenuItem>
              <MenuItem value="Puerto Vallarta">Puerto Vallarta</MenuItem>
              <MenuItem value="Zapopan">Zapopan</MenuItem>
              <MenuItem value="Tlaquepaque">Tlaquepaque</MenuItem>
              <MenuItem value="Tonalá">Tonalá</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Meta de Financiamiento"
              type="number"
              value={formData.fundingGoal}
              onChange={(e) => setFormData({ ...formData, fundingGoal: e.target.value })}
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSaveSchool} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

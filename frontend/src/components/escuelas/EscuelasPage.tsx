'use client';

import {
  Box,
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
} from '@mui/material';
import { useState } from 'react';
import { SchoolNeed, SchoolStructure } from './escuelasInterfaces';
import { mockSchools } from './schoolSampleData';

export default function EscuelasPage() {
  const [schools, setSchools] = useState<SchoolStructure[]>(mockSchools);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolStructure | null>(null);

  const [openNeedsDialog, setOpenNeedsDialog] = useState(false);
  const [managingNeedsSchoolId, setManagingNeedsSchoolId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    region: '',
    school: '',
    name: '',
    employees: '',
    students: '',
    level: '',
    cct: '',
    mode: '',
    shift: '',
    address: '',
    location: '',
    type: 'Publica' as 'Publica' | 'Privada',
    category: '',
    notes: '',
  });

  const [needFormData, setNeedFormData] = useState({
    itemName: '',
    quantity: '1',
    unit: '',
    amount: '',
  });

  const calculateGoal = (needs: SchoolNeed[]) => needs.reduce((total, need) => total + need.amount, 0);

  const progressPercentage = (progress: number, goal: number) => {
    if (!goal) {
      return 0;
    }
    return Math.min(100, Math.round((progress / goal) * 100));
  };

  const filteredSchools = schools.filter((school) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch =
      school.name.toLowerCase().includes(normalizedQuery) ||
      school.school.toLowerCase().includes(normalizedQuery) ||
      school.cct.toLowerCase().includes(normalizedQuery);
    const matchesRegion = !regionFilter || school.region === regionFilter;
    const matchesType = !typeFilter || school.type === typeFilter;
    return matchesSearch && matchesRegion && matchesType;
  });

  const schoolBeingManaged = schools.find((school) => school.id === managingNeedsSchoolId) ?? null;

  const handleOpenDialog = (school?: SchoolStructure) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        region: school.region,
        school: school.school,
        name: school.name,
        employees: school.employees,
        students: school.students,
        level: school.level,
        cct: school.cct,
        mode: school.mode,
        shift: school.shift,
        address: school.address,
        location: school.location,
        type: school.type,
        category: school.category,
        notes: school.notes,
      });
    } else {
      setEditingSchool(null);
      setFormData({
        region: '',
        school: '',
        name: '',
        employees: '',
        students: '',
        level: '',
        cct: '',
        mode: '',
        shift: '',
        address: '',
        location: '',
        type: 'Publica',
        category: '',
        notes: '',
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
                region: formData.region,
                school: formData.school,
                name: formData.name,
                employees: formData.employees,
                students: formData.students,
                level: formData.level,
                cct: formData.cct,
                mode: formData.mode,
                shift: formData.shift,
                address: formData.address,
                location: formData.location,
                type: formData.type,
                category: formData.category,
                notes: formData.notes,
              }
            : s
        )
      );
    } else {
      const newSchool: SchoolStructure = {
        id: schools.length > 0 ? Math.max(...schools.map((s) => s.id)) + 1 : 1,
        region: formData.region,
        school: formData.school,
        name: formData.name,
        employees: formData.employees,
        students: formData.students,
        level: formData.level,
        cct: formData.cct,
        mode: formData.mode,
        shift: formData.shift,
        address: formData.address,
        location: formData.location,
        type: formData.type,
        category: formData.category,
        notes: formData.notes,
        progress: 0,
        needs: [],
      };
      setSchools([...schools, newSchool]);
    }
    handleCloseDialog();
  };

  const handleOpenNeedsDialog = (schoolId: number) => {
    setManagingNeedsSchoolId(schoolId);
    setNeedFormData({
      itemName: '',
      quantity: '1',
      unit: '',
      amount: '',
    });
    setOpenNeedsDialog(true);
  };

  const handleCloseNeedsDialog = () => {
    setOpenNeedsDialog(false);
    setManagingNeedsSchoolId(null);
  };

  const handleAddNeed = () => {
    if (!managingNeedsSchoolId || !needFormData.itemName || !needFormData.amount) {
      return;
    }

    setSchools((currentSchools) =>
      currentSchools.map((school) => {
        if (school.id !== managingNeedsSchoolId) {
          return school;
        }

        const nextNeedId =
          school.needs.length > 0 ? Math.max(...school.needs.map((need) => need.id)) + 1 : 1;

        const newNeed: SchoolNeed = {
          id: nextNeedId,
          itemName: needFormData.itemName,
          quantity: Number(needFormData.quantity || 0),
          unit: needFormData.unit,
          amount: Number(needFormData.amount),
        };

        return {
          ...school,
          needs: [...school.needs, newNeed],
        };
      })
    );

    setNeedFormData({
      itemName: '',
      quantity: '1',
      unit: '',
      amount: '',
    });
  };

  const handleDeleteNeed = (needId: number) => {
    if (!managingNeedsSchoolId) {
      return;
    }

    setSchools((currentSchools) =>
      currentSchools.map((school) =>
        school.id === managingNeedsSchoolId
          ? {
              ...school,
              needs: school.needs.filter((need) => need.id !== needId),
            }
          : school
      )
    );
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="">Todos los Tipos</MenuItem>
              <MenuItem value="Publica">Pública</MenuItem>
              <MenuItem value="Privada">Privada</MenuItem>
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
                  setTypeFilter('');
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
                CCT
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Región
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Tipo
              </TableCell>
              <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                Categoría
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
              const schoolGoal = calculateGoal(school.needs);
              const progress = progressPercentage(school.progress, schoolGoal);
              return (
                <TableRow
                  key={school.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8fafb',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>
                    {school.school} {school.name}
                  </TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{school.cct}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{school.region}</TableCell>
                  <TableCell>
                    <Chip label={school.type} size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{school.category}</TableCell>
                  <TableCell>${schoolGoal.toLocaleString()}</TableCell>
                  <TableCell>${school.progress.toLocaleString()}</TableCell>
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
                        variant="contained"
                        color="secondary"
                        onClick={() => handleOpenNeedsDialog(school.id)}
                        sx={{ textTransform: 'none' }}
                      >
                        Necesidades
                      </Button>
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
              label="Escuela (tipo de plantel)"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Nombre de la Escuela"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="CCT"
              value={formData.cct}
              onChange={(e) => setFormData({ ...formData, cct: e.target.value })}
              variant="outlined"
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Empleados"
                  value={formData.employees}
                  onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Estudiantes"
                  value={formData.students}
                  onChange={(e) => setFormData({ ...formData, students: e.target.value })}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Nivel"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Modalidad"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Turno"
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Dirección"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Ubicación (URL de Google Maps)"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Tipo"
              select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Publica' | 'Privada' })}
            >
              <MenuItem value="Publica">Pública</MenuItem>
              <MenuItem value="Privada">Privada</MenuItem>
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
              label="Notas"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              variant="outlined"
              multiline
              minRows={2}
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

      <Dialog open={openNeedsDialog} onClose={handleCloseNeedsDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>
          Gestionar necesidades {schoolBeingManaged ? `- ${schoolBeingManaged.school} ${schoolBeingManaged.name}` : ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Necesidad"
                  value={needFormData.itemName}
                  onChange={(e) => setNeedFormData({ ...needFormData, itemName: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  value={needFormData.quantity}
                  onChange={(e) => setNeedFormData({ ...needFormData, quantity: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  label="Unidad"
                  value={needFormData.unit}
                  onChange={(e) => setNeedFormData({ ...needFormData, unit: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 8, md: 2 }}>
                <TextField
                  fullWidth
                  label="Monto"
                  type="number"
                  value={needFormData.amount}
                  onChange={(e) => setNeedFormData({ ...needFormData, amount: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 4, md: 2 }}>
                <Button variant="contained" fullWidth sx={{ textTransform: 'none' }} onClick={handleAddNeed}>
                  Agregar
                </Button>
              </Grid>
            </Grid>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Necesidad</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Cantidad</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unidad</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Monto</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '120px' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schoolBeingManaged?.needs.map((need) => (
                    <TableRow key={need.id}>
                      <TableCell>{need.itemName}</TableCell>
                      <TableCell>{need.quantity}</TableCell>
                      <TableCell>{need.unit}</TableCell>
                      <TableCell>${need.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: 'none' }}
                          onClick={() => handleDeleteNeed(need.id)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schoolBeingManaged && schoolBeingManaged.needs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>
                        No hay necesidades registradas para esta escuela.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Meta total: ${schoolBeingManaged ? calculateGoal(schoolBeingManaged.needs).toLocaleString() : '0'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNeedsDialog} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

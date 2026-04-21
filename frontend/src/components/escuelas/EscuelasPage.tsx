'use client';

/**
 * Escuelas (Schools) page – Endpoint 3: GET/POST/PUT/PATCH /api/v1/schools
 *
 * Fetches the school list from the backend on mount and reflects create,
 * edit, and archive operations through the API in real time.
 *
 * The API model exposes: id, name, region, category, description,
 * funding_goal, confirmed_value, progress_pct, status.
 */

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
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import {
  ApiSchool,
  fetchSchools,
  createSchool,
  updateSchool,
  archiveSchool,
} from '@/lib/schoolsService';
import { ApiError } from '@/lib/apiClient';

export default function EscuelasPage() {
  // ── Data & async state ──────────────────────────────────────────────────────
  const [schools, setSchools] = useState<ApiSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<ApiSchool | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    category: '',
    description: '',
    funding_goal: '',
  });

  // ── Load schools from API ───────────────────────────────────────────────────

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, unknown> = { status: 'active' };
      if (regionFilter) filters.region = regionFilter;

      const result = await fetchSchools(filters);
      setSchools(result.schools);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      } else {
        setError('No se pudo cargar la lista de escuelas. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, [regionFilter]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  // ── Dialog handlers ─────────────────────────────────────────────────────────

  const handleOpenDialog = (school?: ApiSchool) => {
    setSaveError(null);
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name,
        region: school.region,
        category: school.category,
        description: school.description ?? '',
        funding_goal: String(school.funding_goal),
      });
    } else {
      setEditingSchool(null);
      setFormData({ name: '', region: '', category: '', description: '', funding_goal: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchool(null);
  };

  // ── Save school (create or update) ─────────────────────────────────────────

  const handleSaveSchool = async () => {
    const fundingGoal = parseFloat(formData.funding_goal);
    if (!formData.name || !formData.region || !formData.category || isNaN(fundingGoal)) {
      setSaveError('Nombre, región, categoría y meta de financiamiento son obligatorios.');
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        region: formData.region,
        category: formData.category,
        description: formData.description || undefined,
        funding_goal: fundingGoal,
      };

      if (editingSchool) {
        // PUT /api/v1/schools/:id
        const updated = await updateSchool(editingSchool.id, payload);
        setSchools((prev) =>
          prev.map((s) => (s.id === editingSchool.id ? updated : s))
        );
      } else {
        // POST /api/v1/schools
        const created = await createSchool(payload);
        setSchools((prev) => [...prev, created]);
      }
      handleCloseDialog();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSaveError('Ya existe una escuela con ese nombre en esa región.');
      } else {
        setSaveError('No se pudo guardar la escuela. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Archive school ──────────────────────────────────────────────────────────

  const handleArchive = async (school: ApiSchool) => {
    try {
      // PATCH /api/v1/schools/:id/archive
      await archiveSchool(school.id);
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
    } catch {
      setError('No se pudo archivar la escuela. Inténtalo de nuevo.');
    }
  };

  // ── Client-side search filter ───────────────────────────────────────────────

  const filteredSchools = schools.filter((school) => {
    const query = searchQuery.toLowerCase();
    return (
      school.name.toLowerCase().includes(query) ||
      school.region.toLowerCase().includes(query) ||
      school.category.toLowerCase().includes(query)
    );
  });

  // ── Render ──────────────────────────────────────────────────────────────────

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

      {/* Page-level error */}
      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Paper sx={{ padding: 2, marginBottom: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{ flex: 1, textTransform: 'none' }}
                onClick={loadSchools}
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
                }}
              >
                Limpiar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Schools Table */}
      {!loading && (
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
                  Meta
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Confirmado
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Progreso
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Estado
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSchools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                    No se encontraron escuelas.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchools.map((school) => (
                  <TableRow
                    key={school.id}
                    sx={{ '&:hover': { backgroundColor: '#f8fafb' } }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{school.name}</TableCell>
                    <TableCell sx={{ color: '#4a5f8f' }}>{school.region}</TableCell>
                    <TableCell sx={{ color: '#4a5f8f' }}>{school.category}</TableCell>
                    <TableCell>${school.funding_goal.toLocaleString()}</TableCell>
                    <TableCell>${school.confirmed_value.toLocaleString()}</TableCell>
                    <TableCell sx={{ width: '140px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, school.progress_pct)}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e7ff',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor:
                                school.progress_pct > 75 ? '#009933' : '#f4981c',
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ minWidth: '36px' }}>
                          {Math.round(school.progress_pct)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={school.status === 'active' ? 'Activa' : 'Archivada'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: school.status === 'active' ? '#dcfce7' : '#f3f4f6',
                          color: school.status === 'active' ? '#166534' : '#6b7280',
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
                        {school.status === 'active' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleArchive(school)}
                            sx={{ textTransform: 'none' }}
                          >
                            Archivar
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>
          {editingSchool ? 'Editar Escuela' : 'Agregar Nueva Escuela'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {saveError && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {saveError}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre de la Escuela"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
              required
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Región"
              select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              required
              disabled={saving}
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
              required
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Meta de Financiamiento ($)"
              type="number"
              value={formData.funding_goal}
              onChange={(e) => setFormData({ ...formData, funding_goal: e.target.value })}
              variant="outlined"
              required
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Descripción (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              variant="outlined"
              multiline
              minRows={2}
              disabled={saving}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSchool}
            variant="contained"
            color="primary"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

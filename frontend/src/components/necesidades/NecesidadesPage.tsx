'use client';

import {
  Box,
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
  Typography,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ApiSchoolNeed,
  SchoolNeedStatus,
  fetchSchoolNeeds,
} from '@/lib/schoolNeedsService';
import { fetchSchools } from '@/lib/schoolsService';

function getStatusColor(status: SchoolNeedStatus) {
  switch (status) {
    case 'Cubierto':
      return { bg: '#dcfce7', text: '#166534' };
    case 'Cubierto parcialmente':
      return { bg: '#fef9c3', text: '#854d0e' };
    case 'Aun no cubierto':
    default:
      return { bg: '#fee2e2', text: '#991b1b' };
  }
}

export default function NecesidadesPage() {
  const searchParams = useSearchParams();

  // ── Data & async state ──────────────────────────────────────────────────────
  const [needs, setNeeds] = useState<ApiSchoolNeed[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [schoolFilter, setSchoolFilter] = useState(searchParams.get('school_id') ?? '');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Load schools for the filter dropdown ────────────────────────────────────
  useEffect(() => {
    fetchSchools({ per_page: 100 })
      .then((res) => setSchools(res.schools.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {/* non-critical */});
  }, []);

  // ── Load needs from API ─────────────────────────────────────────────────────
  const loadNeeds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, unknown> = { per_page: 100 };
      if (schoolFilter) filters.school_id = schoolFilter;
      if (statusFilter) filters.status    = statusFilter;

      const result = await fetchSchoolNeeds(filters);
      setNeeds(result.items);
    } catch {
      setError('No se pudo cargar la lista de necesidades. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [schoolFilter, statusFilter]);

  useEffect(() => {
    loadNeeds();
  }, [loadNeeds]);

  // ── Client-side search ──────────────────────────────────────────────────────
  const filteredNeeds = needs.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.item_name.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q) ||
      n.subcategory.toLowerCase().includes(q) ||
      (n.school_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Necesidades de Escuelas
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ padding: 2, marginBottom: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Buscar artículo, categoría..."
              placeholder="Buscar..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              displayEmpty
              fullWidth
              size="small"
            >
              <MenuItem value="">Todas las Escuelas</MenuItem>
              {schools.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
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
              <MenuItem value="Aun no cubierto">Aun no cubierto</MenuItem>
              <MenuItem value="Cubierto parcialmente">Cubierto parcialmente</MenuItem>
              <MenuItem value="Cubierto">Cubierto</MenuItem>
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{ flex: 1, textTransform: 'none' }}
                onClick={loadNeeds}
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
                  setSchoolFilter('');
                  setStatusFilter('');
                }}
              >
                Limpiar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Table */}
      {!loading && (
        <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafb' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Escuela</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Categoría</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Subcategoría</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Artículo</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Cantidad</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Monto</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNeeds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                    No se encontraron necesidades.
                  </TableCell>
                </TableRow>
              ) : (
                filteredNeeds.map((need) => {
                  const statusColor = getStatusColor(need.status);
                  return (
                    <TableRow key={need.id} sx={{ '&:hover': { backgroundColor: '#f8fafb' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{need.school_name ?? '—'}</TableCell>
                      <TableCell sx={{ color: '#4a5f8f' }}>{need.category}</TableCell>
                      <TableCell sx={{ color: '#4a5f8f' }}>{need.subcategory}</TableCell>
                      <TableCell>{need.item_name}</TableCell>
                      <TableCell>
                        {need.quantity != null
                          ? `${need.quantity}${need.unit ? ` ${need.unit}` : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        ${need.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={need.status}
                          size="small"
                          sx={{ backgroundColor: statusColor.bg, color: statusColor.text, fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

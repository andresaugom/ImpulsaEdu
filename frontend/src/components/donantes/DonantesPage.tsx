'use client';

/**
 * Donantes (Donors) page – Endpoint 2: GET/POST/PUT/PATCH /api/v1/donors
 *
 * Fetches the donor list from the backend on mount and reflects any
 * create / edit / deactivate operations through the API in real time.
 * Loading and error states are shown inline.
 */

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { Donor } from './donantesInterfaces';
import { getStatusColor, getTypeLabel } from './donantesUiHooks';
import {
  fetchDonors,
  createDonor,
  updateDonor,
  deactivateDonor,
  activateDonor,
  deleteDonor,
} from '@/lib/donorsService';
import { ApiError } from '@/lib/apiClient';

export default function DonantesPage() {
  // ── Data & async state ──────────────────────────────────────────────────────
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    donor_type: 'Fisica' as 'Fisica' | 'Moral',
    region: '',
    email: '',
    phone: '',
  });

  // ── Confirm delete dialog state ─────────────────────────────────────────────
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ── Load donors from API ────────────────────────────────────────────────────

  const loadDonors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, unknown> = {};
      if (searchQuery) filters.name = searchQuery;
      if (typeFilter) filters.type = typeFilter;
      if (statusFilter) filters.is_active = statusFilter === 'active';

      const result = await fetchDonors(filters);
      setDonors(result.donors);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      } else {
        setError('No se pudo cargar la lista de donantes. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter]);

  // Initial load
  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

  // ── Dialog handlers ─────────────────────────────────────────────────────────

  const handleOpenDialog = (donor?: Donor) => {
    setSaveError(null);
    if (donor) {
      setEditingDonor(donor);
      setFormData({
        name: donor.name,
        donor_type: donor.donor_type,
        region: donor.region,
        email: donor.email ?? '',
        phone: donor.phone ?? '',
      });
    } else {
      setEditingDonor(null);
      setFormData({ name: '', donor_type: 'Fisica', region: '', email: '', phone: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDonor(null);
  };

  // ── Save donor (create or update) ───────────────────────────────────────────

  const handleSaveDonor = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      if (editingDonor) {
        const updated = await updateDonor(editingDonor.id, {
          name: formData.name,
          donor_type: formData.donor_type,
          region: formData.region,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        });
        setDonors((prev) =>
          prev.map((d) => (d.id === editingDonor.id ? updated : d))
        );
      } else {
        const created = await createDonor({
          name: formData.name,
          donor_type: formData.donor_type,
          region: formData.region,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
        });
        setDonors((prev) => [...prev, created]);
      }
      handleCloseDialog();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSaveError('Ya existe un donante con ese correo electrónico.');
      } else {
        setSaveError('No se pudo guardar el donante. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate donor ────────────────────────────────────────────────────────

  const handleDeactivate = async (donor: Donor) => {
    try {
      // PATCH /api/v1/donors/:id/deactivate
      await deactivateDonor(donor.id);
      setDonors((prev) =>
        prev.map((d) =>
          d.id === donor.id ? { ...d, status: 'inactive' as const } : d
        )
      );
    } catch {
      setError('No se pudo desactivar al donante. Inténtalo de nuevo.');
    }
  };

  // ── Activate donor ──────────────────────────────────────────────────────────

  const handleActivate = async (donor: Donor) => {
    try {
      await activateDonor(donor.id);
      setDonors((prev) => prev.filter((d) => d.id !== donor.id));
    } catch {
      setError('No se pudo activar al donante. Inténtalo de nuevo.');
    }
  };

  // ── Permanently delete donor ────────────────────────────────────────────────

  const handleDeleteConfirm = (id: string) => {
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteExecute = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteDonor(pendingDeleteId);
      setDonors((prev) => prev.filter((d) => d.id !== pendingDeleteId));
    } catch {
      setError('No se pudo eliminar al donante. Inténtalo de nuevo.');
    } finally {
      setConfirmDeleteOpen(false);
      setPendingDeleteId(null);
    }
  };

  // ── Client-side filter (applied on top of server results) ──────────────────

  const filteredDonors = donors.filter((donor) => {
    const matchesSearch = donor.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || donor.donor_type === typeFilter;
    const matchesStatus = !statusFilter || donor.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
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
          Registro de Donantes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none' }}
        >
          + Agregar Donante
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
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Nombre del Donante"
              placeholder="Buscar donantes..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
              <MenuItem value="Fisica">Persona Física</MenuItem>
              <MenuItem value="Moral">Persona Moral</MenuItem>
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
              <MenuItem value="active">Activo</MenuItem>
              <MenuItem value="inactive">Inactivo</MenuItem>
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{ flex: 1, textTransform: 'none' }}
                onClick={loadDonors}
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
                  setTypeFilter('');
                  setStatusFilter('');
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

      {/* Donors Table */}
      {!loading && (
        <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f8fafb' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Nombre del Donante
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Tipo
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Correo
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Teléfono
                </TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '13px' }}>
                  Donaciones
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
              {filteredDonors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                    No se encontraron donantes.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDonors.map((donor) => {
                  const statusColor = getStatusColor(donor.status);
                  return (
                    <TableRow
                      key={donor.id}
                      sx={{ '&:hover': { backgroundColor: '#f8fafb' } }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{donor.name}</TableCell>
                      <TableCell sx={{ color: '#4a5f8f' }}>{getTypeLabel(donor.donor_type)}</TableCell>
                      <TableCell sx={{ color: '#4a5f8f' }}>{donor.email ?? '—'}</TableCell>
                      <TableCell sx={{ color: '#4a5f8f' }}>{donor.phone ?? '—'}</TableCell>
                      <TableCell>{donor.totalDonations}</TableCell>
                      <TableCell>
                        <Chip
                          label={donor.status === 'active' ? 'Activo' : 'Inactivo'}
                          size="small"
                          sx={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {donor.status === 'active' && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => handleOpenDialog(donor)}
                                sx={{ textTransform: 'none' }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => handleDeactivate(donor)}
                                sx={{ textTransform: 'none' }}
                              >
                                Desactivar
                              </Button>
                            </>
                          )}
                          {donor.status === 'inactive' && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleActivate(donor)}
                                sx={{ textTransform: 'none' }}
                              >
                                Activar
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleDeleteConfirm(donor.id)}
                                sx={{ textTransform: 'none' }}
                              >
                                Eliminar
                              </Button>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>
          {editingDonor ? 'Editar Donante' : 'Agregar Nuevo Donante'}
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
              label="Nombre del Donante"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Tipo"
              select
              value={formData.donor_type}
              onChange={(e) =>
                setFormData({ ...formData, donor_type: e.target.value as 'Fisica' | 'Moral' })
              }
              disabled={saving}
            >
              <MenuItem value="Fisica">Persona Física</MenuItem>
              <MenuItem value="Moral">Persona Moral</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Región / Municipio"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              variant="outlined"
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Correo Electrónico"
              type="text"
              inputProps={{ inputMode: 'email', autoComplete: 'email' }}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              variant="outlined"
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              variant="outlined"
              disabled={saving}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveDonor}
            variant="contained"
            color="primary"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Permanent Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar permanentemente?</DialogTitle>
        <DialogContent>
          <Typography>
            Esta acción es irreversible. El donante será eliminado de forma permanente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleDeleteExecute} variant="contained" color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

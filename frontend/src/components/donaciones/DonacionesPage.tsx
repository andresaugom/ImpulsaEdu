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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';
import {
  ApiDonationSummary,
  DonationStatus,
  DonationType,
  fetchDonations,
  getDonation,
  createDonation,
  updateDonation,
  updateDonationStatus,
  CreateDonationPayload,
  UpdateDonationPayload,
} from '../../lib/donationsService';
import { fetchDonors } from '../../lib/donorsService';
import { fetchSchools } from '../../lib/schoolsService';
import { getStatusColor, getTypeColor, getTypeLabel, getStatusLabel } from './donacionesUiHooks';

type DialogMode = 'create' | 'edit' | 'status';

export default function DonacionesPage() {
  const [donations, setDonations] = useState<ApiDonationSummary[]>([]);
  const [donors, setDonors] = useState<{ id: string; name: string }[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    donor_id: '',
    school_id: '',
    donation_type: 'Material' as DonationType,
    description: '',
    amount: '',
  });

  const [editForm, setEditForm] = useState({
    description: '',
  });

  const [statusForm, setStatusForm] = useState<DonationStatus>('Aprobado');

  useEffect(() => {
    loadDonations();
    loadSelectOptions();
  }, []);

  async function loadDonations() {
    try {
      setLoading(true);
      setError(null);
      const { items } = await fetchDonations({ per_page: 100 });
      setDonations(items);
    } catch {
      setError('Error al cargar las donaciones.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectOptions() {
    try {
      const [donorsRes, schoolsRes] = await Promise.all([
        fetchDonors({ is_active: true, per_page: 100 }),
        fetchSchools({ status: 'active', per_page: 100 }),
      ]);
      setDonors(donorsRes.donors.map((d) => ({ id: d.id, name: d.name })));
      setSchools(schoolsRes.schools.map((s) => ({ id: s.id, name: s.name })));
    } catch {
      // Non-critical — create form may have empty selects
    }
  }

  const filteredDonations = donations.filter((d) => {
    const matchesSearch =
      d.donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setDialogMode('create');
    setEditingId(null);
    setCreateForm({ donor_id: '', school_id: '', donation_type: 'Material', description: '', amount: '' });
    setDialogError(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = async (donation: ApiDonationSummary) => {
    setDialogMode('edit');
    setEditingId(donation.id);
    setDialogError(null);
    setEditForm({ description: '' });
    setOpenDialog(true);
    try {
      const detail = await getDonation(donation.id);
      setEditForm({ description: detail.description ?? '' });
    } catch {
      setDialogError('No se pudo cargar el detalle de la donación.');
    }
  };

  const handleOpenStatus = (donation: ApiDonationSummary) => {
    setDialogMode('status');
    setEditingId(donation.id);
    setStatusForm('Aprobado');
    setDialogError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setDialogError(null);
    try {
      if (dialogMode === 'create') {
        const payload: CreateDonationPayload = {
          donor_id: createForm.donor_id,
          school_id: createForm.school_id,
          donation_type: createForm.donation_type,
          description: createForm.description || undefined,
          amount: createForm.amount ? Number(createForm.amount) : undefined,
        };
        await createDonation(payload);
      } else if (dialogMode === 'edit' && editingId) {
        const payload: UpdateDonationPayload = {
          description: editForm.description || undefined,
        };
        await updateDonation(editingId, payload);
      } else if (dialogMode === 'status' && editingId) {
        await updateDonationStatus(editingId, { status: statusForm });
      }
      await loadDonations();
      handleCloseDialog();
    } catch {
      setDialogError('Error al guardar los cambios.');
    }
  };

  const isTerminal = (status: DonationStatus) =>
    status === 'Finalizado' || status === 'Cancelado';

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
          Donaciones
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenCreate}
          sx={{ textTransform: 'none' }}
        >
          + Nueva Donación
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Buscar donaciones..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Filtrar por Estado</MenuItem>
          <MenuItem value="Registrado">Registrada</MenuItem>
          <MenuItem value="Aprobado">Aprobada</MenuItem>
          <MenuItem value="Entregando">En Entrega</MenuItem>
          <MenuItem value="Entregado">Entregada</MenuItem>
          <MenuItem value="Finalizado">Finalizada</MenuItem>
          <MenuItem value="Cancelado">Cancelada</MenuItem>
        </Select>
      </Box>

      {/* Donations Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
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
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDonations.map((donation) => {
                const statusColor = getStatusColor(donation.status);
                const typeColor = getTypeColor(donation.donation_type);
                return (
                  <TableRow
                    key={donation.id}
                    sx={{ '&:hover': { backgroundColor: '#f8fafb' } }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{donation.id}</TableCell>
                    <TableCell sx={{ color: '#4a5f8f' }}>{donation.donor.name}</TableCell>
                    <TableCell sx={{ color: '#4a5f8f' }}>{donation.school.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(donation.donation_type)}
                        size="small"
                        sx={{ backgroundColor: typeColor.bg, color: typeColor.text, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(donation.status)}
                        size="small"
                        sx={{ backgroundColor: statusColor.bg, color: statusColor.text, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleOpenEdit(donation)}
                          sx={{ textTransform: 'none' }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={() => handleOpenStatus(donation)}
                          disabled={isTerminal(donation.status)}
                          sx={{ textTransform: 'none' }}
                        >
                          Estado
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit/Status Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '18px' }}>
          {dialogMode === 'create'
            ? 'Nueva Donación'
            : dialogMode === 'edit'
            ? 'Editar Donación'
            : 'Cambiar Estado'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialogMode === 'create' && (
              <>
                <TextField
                  fullWidth label="Donante" select value={createForm.donor_id}
                  onChange={(e) => setCreateForm({ ...createForm, donor_id: e.target.value })}
                >
                  {donors.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth label="Escuela" select value={createForm.school_id}
                  onChange={(e) => setCreateForm({ ...createForm, school_id: e.target.value })}
                >
                  {schools.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth label="Tipo" select value={createForm.donation_type}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, donation_type: e.target.value as DonationType })
                  }
                >
                  <MenuItem value="Material">Material</MenuItem>
                  <MenuItem value="Monetaria">Monetaria</MenuItem>
                </TextField>
                <TextField
                  fullWidth label="Monto ($)" type="number" value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                />
                <TextField
                  fullWidth label="Descripción" value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  multiline rows={2}
                />
              </>
            )}
            {dialogMode === 'edit' && (
              <TextField
                fullWidth label="Descripción" value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                multiline rows={2}
              />
            )}
            {dialogMode === 'status' && (
              <TextField
                fullWidth label="Nuevo Estado" select value={statusForm}
                onChange={(e) => setStatusForm(e.target.value as DonationStatus)}
              >
                <MenuItem value="Aprobado">Aprobada</MenuItem>
                <MenuItem value="Entregando">En Entrega</MenuItem>
                <MenuItem value="Entregado">Entregada</MenuItem>
                <MenuItem value="Finalizado">Finalizada</MenuItem>
                <MenuItem value="Cancelado">Cancelada</MenuItem>
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

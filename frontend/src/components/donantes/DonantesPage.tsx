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
  Grid,
} from '@mui/material';
import { useState } from 'react';
import { Donor } from "./donantesInterfaces";
import { mockDonors } from './donantesSampleData';
import { getStatusColor, getTypeLabel } from './donantesUiHooks';

export default function DonantesPage() {
  const [donors, setDonors] = useState<Donor[]>(mockDonors);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual',
    email: '',
    phone: '',
  });

  const filteredDonors = donors.filter((donor) => {
    const matchesSearch = donor.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || donor.type === typeFilter;
    const matchesStatus = !statusFilter || donor.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleOpenDialog = (donor?: Donor) => {
    if (donor) {
      setEditingDonor(donor);
      setFormData({
        name: donor.name,
        type: donor.type,
        email: donor.email,
        phone: donor.phone,
      });
    } else {
      setEditingDonor(null);
      setFormData({
        name: '',
        type: 'individual',
        email: '',
        phone: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDonor(null);
  };

  const handleSaveDonor = () => {
    if (editingDonor) {
      setDonors(
        donors.map((d) =>
          d.id === editingDonor.id
            ? {
                ...d,
                name: formData.name,
                type: formData.type as 'individual' | 'corporate',
                email: formData.email,
                phone: formData.phone,
              }
            : d
        )
      );
    } else {
      const newDonor: Donor = {
        id: Math.max(...donors.map((d) => d.id)) + 1,
        name: formData.name,
        type: formData.type as 'individual' | 'corporate',
        email: formData.email,
        phone: formData.phone,
        totalDonations: 0,
        status: 'active',
      };
      setDonors([...donors, newDonor]);
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
              <MenuItem value="individual">Persona Física</MenuItem>
              <MenuItem value="corporate">Persona Moral</MenuItem>
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

      {/* Donors Table */}
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
                Donaciones Totales
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
            {filteredDonors.map((donor) => {
              const statusColor = getStatusColor(donor.status);
              return (
                <TableRow
                  key={donor.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8fafb',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{donor.name}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{getTypeLabel(donor.type)}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{donor.email}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{donor.phone}</TableCell>
                  <TableCell>${donor.totalDonations.toLocaleString()}</TableCell>
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
                    <Box sx={{ display: 'flex', gap: 1 }}>
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
          {editingDonor ? 'Editar Donante' : 'Agregar Nuevo Donante'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre del Donante"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Tipo"
              select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <MenuItem value="individual">Persona Física</MenuItem>
              <MenuItem value="corporate">Persona Moral</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSaveDonor} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
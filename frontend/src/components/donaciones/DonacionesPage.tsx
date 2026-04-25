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
 
} from '@mui/material';
import { useState } from 'react';
import { Donation } from "./donacionesInterfaces";
import { mockDonations } from './donacionesSampleData';
import { getStatusColor, getTypeColor, getTypeLabel, getStatusLabel } from './donacionesUiHooks';

export default function DonacionesPage() {
  const [donations, setDonations] = useState<Donation[]>(mockDonations);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [formData, setFormData] = useState({
    donor: '',
    school: '',
    type: 'material',
    deliveryMode: '',
    status: 'pending',
  });

  const filteredDonations = donations.filter((donation) => {
    const matchesSearch =
      donation.donor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || donation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (donation?: Donation) => {
    if (donation) {
      setEditingDonation(donation);
      setFormData({
        donor: donation.donor,
        school: donation.school,
        type: donation.type,
        deliveryMode: donation.deliveryMode,
        status: donation.status,
      });
    } else {
      setEditingDonation(null);
      setFormData({
        donor: '',
        school: '',
        type: 'material',
        deliveryMode: '',
        status: 'pending',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDonation(null);
  };

  const handleSaveDonation = () => {
    if (editingDonation) {
      setDonations(
        donations.map((d) =>
          d.id === editingDonation.id
            ? {
                ...d,
                donor: formData.donor,
                school: formData.school,
                type: formData.type as 'material' | 'monetary',
                deliveryMode: formData.deliveryMode,
                status: formData.status as 'pending' | 'delivered' | 'cancelled',
              }
            : d
        )
      );
    } else {
      const newDonation: Donation = {
        id: `#DN${String(donations.length + 1).padStart(3, '0')}`,
        donor: formData.donor,
        school: formData.school,
        type: formData.type as 'material' | 'monetary',
        deliveryMode: formData.deliveryMode,
        status: formData.status as 'pending' | 'delivered' | 'cancelled',
      };
      setDonations([...donations, newDonation]);
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
          Donaciones
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none' }}
        >
          + Nueva Donación
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          marginBottom: 3,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          placeholder="Buscar donaciones..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            minWidth: 200,
          }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          displayEmpty
          size="small"
          sx={{
            minWidth: 200,
          }}
        >
          <MenuItem value="">Filtrar por Estado</MenuItem>
          <MenuItem value="pending">Pendiente</MenuItem>
          <MenuItem value="delivered">Entregada</MenuItem>
          <MenuItem value="cancelled">Cancelada</MenuItem>
        </Select>
      </Box>

      {/* Donations Table */}
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
                Modo de Entrega
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
              const typeColor = getTypeColor(donation.type);
              return (
                <TableRow
                  key={donation.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f8fafb',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{donation.id}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{donation.donor}</TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{donation.school}</TableCell>
                  <TableCell>
                    <Chip
                      label={getTypeLabel(donation.type)}
                      size="small"
                      sx={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#4a5f8f' }}>{donation.deliveryMode}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(donation.status)}
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
                        onClick={() => handleOpenDialog(donation)}
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
          {editingDonation ? 'Editar Donación' : 'Nueva Donación'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Donante"
              value={formData.donor}
              onChange={(e) => setFormData({ ...formData, donor: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Escuela"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Tipo"
              select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <MenuItem value="material">Material</MenuItem>
              <MenuItem value="monetary">Monetaria</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Modo de Entrega"
              value={formData.deliveryMode}
              onChange={(e) => setFormData({ ...formData, deliveryMode: e.target.value })}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Estado"
              select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="delivered">Entregada</MenuItem>
              <MenuItem value="cancelled">Cancelada</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSaveDonation} variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
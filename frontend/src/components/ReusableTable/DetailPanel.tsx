import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Stack,
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { DetailPanelProps } from "@/app/uitools/interfaces";
import { Snackbar, Alert } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function DetailPanel<T extends { id: string }>({
  editable,
  editableFields,
  isNew,
  onEditField,
  onSaveChanges,
  onDelete,
  readOnly,
}: DetailPanelProps<T>) {
  const [openConfirm, setOpenConfirm] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

  const inputStyles = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      backgroundColor: "#F1F5F9",
    },
  };

  const handleDeleteClick = () => setOpenConfirm(true);
  const handleCancelDelete = () => setOpenConfirm(false);
  
  const handleConfirmDelete = async () => {
    setOpenConfirm(false);
    await onDelete?.();
    setDeleteSuccessOpen(true);
  };
  
  const handleSaveClick = async () => {
    if (!onSaveChanges) return;
  
    try {
      setSaving(true);
      setSaveSuccess(false);
  
      await onSaveChanges();
  
      setSaveSuccess(true);
      setSaveSuccessOpen(true);
  
      // Reset checkmark after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };
  
  

  return (
    <Box flex={1}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        {isNew ? "Nuevo elemento" : "Detalles"}
      </Typography>

      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, minHeight: "250px" }}>
        {editable ? (
          <>
            {editableFields.map((field) => {
              const value = editable[field.key];

              // READ ONLY MODE (o edición deshabilitada)
              if (readOnly || !onEditField) {
                return (
                  <Box key={String(field.key)} mt={2}>
                    <Typography fontWeight={600}>{field.label}</Typography>
                    <Typography color="text.secondary">
                      {value !== undefined && value !== null ? String(value) : "-"}
                    </Typography>
                  </Box>
                );
              }

              // SELECT (Dropdown)
              if (field.select && field.options) {
                return (
                  <TextField
                    key={String(field.key)}
                    select
                    fullWidth
                    label={field.label}
                    value={value ?? ""}
                    onChange={(e) => onEditField(field.key, e.target.value as unknown as T[keyof T])}
                    sx={{ ...inputStyles, mt: 2 }}
                  >
                    {field.options.map((opt, i) => (
                      <MenuItem key={i} value={opt.value as unknown as string | number}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }

              // TEXT / NUMBER / OTHER INPUTS
              return (
                <TextField
                  key={String(field.key)}
                  fullWidth
                  label={field.label}
                  value={value ?? ""}
                  onChange={(e) =>
                    onEditField(
                      field.key,
                      (field.type === "number"
                        ? Number(e.target.value)
                        : e.target.value) as unknown as T[keyof T]
                    )
                  }
                  type={field.type || "text"}
                  multiline={field.multiline}
                  rows={field.multiline ? 3 : 1}
                  sx={{ ...inputStyles, mt: 2 }}
                />
              );
            })}

            {onSaveChanges && (
              <Stack direction="row" spacing={2} mt={3}>
                <Button
                  variant="contained"
                  onClick={handleSaveClick}
                  disabled={saving}
                  startIcon={
                    saveSuccess ? <CheckCircleIcon /> : undefined
                  }
                >
                  {saving
                    ? "Guardando..."
                    : saveSuccess
                      ? "Guardado"
                      : isNew
                        ? "Agregar"
                        : "Guardar Cambios"}
                </Button>

                {onDelete && !isNew && (
                  <Button variant="outlined" onClick={handleDeleteClick}>
                    Borrar
                  </Button>
                )}
              </Stack>
            )}

            {/* Confirmación de eliminado */}
            <Dialog open={openConfirm} onClose={handleCancelDelete}>
              <DialogContent>
                <DialogContentText>
                  ¿Seguro que deseas eliminar este elemento?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCancelDelete}>Cancelar</Button>
                <Button color="error" onClick={handleConfirmDelete}>
                  Borrar
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : (
          <Typography color="textSecondary" textAlign="center" mt={5}>
            Selecciona un elemento o crea uno nuevo.
          </Typography>
        )}
      </Paper>
      <Snackbar
        open={saveSuccessOpen}
        autoHideDuration={3000}
        onClose={() => setSaveSuccessOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSaveSuccessOpen(false)}
          severity="success"
          variant="filled"
        >
          {isNew ? "Elemento agregado correctamente" : "Cambios guardados correctamente"}
        </Alert>
      </Snackbar>
      <Snackbar
        open={deleteSuccessOpen}
        autoHideDuration={3000}
        onClose={() => setDeleteSuccessOpen(false)}
      >
        <Alert severity="success" variant="filled">
          Producto eliminado correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
}
'use client';

import {
  Box,
  Button,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { useState, useCallback } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DescriptionIcon from '@mui/icons-material/Description';
import { uploadXlsx, downloadXlsx } from '@/lib/xlsxService';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
}

export default function GestionExcelPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Validate file type
  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    return hasValidType || hasValidExtension;
  };

  // Upload file using xlsxService
  const uploadFile = async (file: File) => {
    const fileId = `${Date.now()}-${file.name}`;

    const newFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
    };

    setUploadedFiles(prev => [...prev, newFile]);

    // Simulate progress while upload is in flight
    const progressInterval = setInterval(() => {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        )
      );
    }, 200);

    try {
      await uploadXlsx(file);

      clearInterval(progressInterval);

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      setAlert({
        type: 'success',
        message: `Archivo "${file.name}" subido exitosamente`,
      });

      setTimeout(() => setAlert(null), 5000);

    } catch (error: unknown) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);

      const uploadErrorMessage = error instanceof Error ? error.message : 'Error desconocido';

      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                progress: 0,
                errorMessage: uploadErrorMessage,
              }
            : f
        )
      );

      setAlert({
        type: 'error',
        message: `Error al subir "${file.name}": ${uploadErrorMessage}`,
      });
    }
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const excelFiles = files.filter(validateFile);
    const invalidFiles = files.filter(f => !validateFile(f));

    if (invalidFiles.length > 0) {
      setAlert({
        type: 'error',
        message: `${invalidFiles.length} archivo(s) rechazado(s). Solo se permiten archivos .xlsx`,
      });
    }

    excelFiles.forEach(file => uploadFile(file));
  }, []);

  // Handle file input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const excelFiles = files.filter(validateFile);
    const invalidFiles = files.filter(f => !validateFile(f));

    if (invalidFiles.length > 0) {
      setAlert({
        type: 'error',
        message: `${invalidFiles.length} archivo(s) rechazado(s). Solo se permiten archivos .xlsx`,
      });
    }

    excelFiles.forEach(file => uploadFile(file));

    // Reset input
    e.target.value = '';
  };

  // Handle download using xlsxService
  const handleDownload = async () => {
    setIsDownloading(true);
    setAlert({ type: 'info', message: 'Preparando descarga...' });

    try {
      const blob = await downloadXlsx();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setAlert({ type: 'success', message: 'Archivo descargado exitosamente' });
      setTimeout(() => setAlert(null), 5000);

    } catch (error: unknown) {
      console.error('Download error:', error);
      setAlert({
        type: 'error',
        message: `Error al descargar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Remove file from list
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, marginBottom: 1 }}>
          Gestión de Archivos Excel
        </Typography>
        <Typography sx={{ color: '#6b7280' }}>
          Sube y descarga archivos Excel para gestionar datos del sistema
        </Typography>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert(null)}
          sx={{ marginBottom: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Download Section */}
      <Paper sx={{ padding: 3, marginBottom: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 1 }}>
              Descargar Datos
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>
              Descarga un archivo Excel con todos los datos del sistema
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={isDownloading}
            sx={{
              backgroundColor: '#014196',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              paddingX: 3,
              paddingY: 1.5,
              '&:hover': { backgroundColor: '#1E293B' },
              '&:disabled': { backgroundColor: '#9ca3af' },
            }}
          >
            {isDownloading ? 'Descargando...' : 'Descargar Excel'}
          </Button>
        </Box>
      </Paper>

      {/* Upload Section */}
      <Paper sx={{ padding: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, marginBottom: 2 }}>
          Subir Archivos Excel
        </Typography>

        {/* Drag and Drop Zone */}
        <Box
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            border: isDragging ? '3px dashed #014196' : '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: 6,
            textAlign: 'center',
            backgroundColor: isDragging ? '#f0f9ff' : '#f9fafb',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: 3,
            '&:hover': {
              borderColor: '#014196',
              backgroundColor: '#f0f9ff',
            },
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 64,
              color: isDragging ? '#014196' : '#9ca3af',
              marginBottom: 2,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 1 }}>
            {isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra archivos Excel aquí'}
          </Typography>
          <Typography sx={{ color: '#6b7280', marginBottom: 2 }}>
            o haz clic para seleccionar archivos
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Solo archivos .xlsx (máximo 10MB por archivo)
          </Typography>

          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
        </Box>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, marginBottom: 2 }}>
              Archivos Subidos ({uploadedFiles.length})
            </Typography>
            <List sx={{ backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              {uploadedFiles.map((file) => (
                <ListItem
                  key={file.id}
                  sx={{
                    borderBottom: '1px solid #e5e7eb',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ marginRight: 2 }}>
                    {file.status === 'success' && (
                      <CheckCircleIcon sx={{ color: '#10b981', fontSize: 32 }} />
                    )}
                    {file.status === 'error' && (
                      <ErrorIcon sx={{ color: '#ef4444', fontSize: 32 }} />
                    )}
                    {file.status === 'uploading' && (
                      <DescriptionIcon sx={{ color: '#014196', fontSize: 32 }} />
                    )}
                  </Box>

                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 600 }}>{file.name}</Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {formatFileSize(file.size)}
                          {file.status === 'error' && file.errorMessage && (
                            <> • {file.errorMessage}</>
                          )}
                        </Typography>
                        {file.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={file.progress}
                            sx={{
                              marginTop: 1,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#e5e7eb',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#014196',
                              },
                            }}
                          />
                        )}
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    {file.status !== 'uploading' && (
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFile(file.id)}
                        sx={{ color: '#6b7280' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
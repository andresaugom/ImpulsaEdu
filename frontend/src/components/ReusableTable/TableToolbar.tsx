import React from "react";
import { Box, Typography, TextField, Button, MenuItem } from "@mui/material";
import { TableToolbarProps } from "@/uitools/interfaces";

const inputStyles = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "#F1F5F9",
  },
};

export default function TableToolbar<T>({
  title,
  searchQuery,
  setSearchQuery,
  sortField,
  setSortField,
  filters,
  setFilters,
  columns,
  onAddNew,
  data,
  enableDateRangeFilter,
  dateRange,
  setDateRange,
}: TableToolbarProps<T>) {

    const removeAccents = (str: string) =>
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const handleExportCSV = () => {
        if (data.length === 0) return;
      
        // Remove accents from headers
        const headers = columns
          .map((c) => removeAccents(c.label))
          .join(",");
      
        const rows = data.map((row) =>
          columns
            .map((c) =>
              `"${removeAccents(String(row[c.key] ?? "")).replace(/"/g, '""')}"`
            )
            .join(",")
        );
      
        const csvContent = [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.replace(/\s+/g, "_").toLowerCase()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      };
      
      return (
        <Box display="flex" flexDirection="column" gap={2} mb={2}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={600}>
              {title}
            </Typography>
      
            <Button
              variant="contained"
              onClick={onAddNew}
              sx={{
                backgroundColor: "#014196",
                color: "white",
                borderRadius: "8px",
                textTransform: "none",
                "&:hover": { backgroundColor: "#1E293B" },
              }}
            >
              + Agregar nuevo
            </Button>
          </Box>
      
          {/* Controls */}
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={2}>
            {/* Search */}
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={inputStyles}
            />
      
            {/* Sort */}
            <TextField
              select
              size="small"
              label="Ordenar por"
              value={sortField as string}
              onChange={(e) => setSortField(e.target.value as keyof T)}
              sx={{ minWidth: 160, ...inputStyles }}
            >
              {columns
                .filter((c) => c.sortable)
                .map((c) => (
                  <MenuItem key={String(c.key)} value={String(c.key)}>
                    {c.label}
                  </MenuItem>
                ))}
            </TextField>
      
            {/* Column filters */}
            {columns
              .filter((c) => c.filterable && c.filterOptions)
              .map((c) => (
                <TextField
                  key={String(c.key)}
                  select
                  size="small"
                  label={c.label}
                  value={filters[c.key as string] || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      [c.key as string]: e.target.value,
                    })
                  }
                  sx={{ minWidth: 180, ...inputStyles }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {c.filterOptions!.map((o) => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  ))}
                </TextField>
              ))}
      
            {/* Date range filter */}
            {enableDateRangeFilter && dateRange && setDateRange && (
              <Box display="flex" gap={2}>
                <TextField
                  type="date"
                  size="small"
                  label="Desde"
                  InputLabelProps={{ shrink: true }}
                  value={dateRange.from || ""}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      from: e.target.value || null,
                    }))
                  }
                  sx={inputStyles}
                />
      
                <TextField
                  type="date"
                  size="small"
                  label="Hasta"
                  InputLabelProps={{ shrink: true }}
                  value={dateRange.to || ""}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      to: e.target.value || null,
                    }))
                  }
                  sx={inputStyles}
                />
              </Box>
            )}
      
            {/* Export */}
            <Button
              variant="outlined"
              onClick={handleExportCSV}
              sx={{
                borderColor: "#1E293B",
                color: "#1E293B",
                textTransform: "none",
                borderRadius: "8px",
                "&:hover": { backgroundColor: "#F1F5F9" },
              }}
            >
              Exportar Excel
            </Button>
          </Box>
        </Box>
      );
      
}
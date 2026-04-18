import React from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, Typography } from "@mui/material";
import { DataTableProps } from "@/app/uitools/interfaces";

export default function DataTable<T extends { id: string }>({ columns, data, onSelect }: DataTableProps<T>) {
  return (
    <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#1E293B" }}>
            {columns.map(c => <TableCell key={String(c.key)} sx={{ color: "white" }}>{c.label}</TableCell>)}
            <TableCell sx={{ color: "white" }}>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(row => (
            <TableRow key={row.id} hover>
              {columns.map(c => (
                <TableCell key={String(c.key)}>
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "")}
                </TableCell>
              ))}
              <TableCell>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onSelect(row)}
                  sx={{
                    borderColor: "#1E293B",
                    color: "#1E293B",
                    textTransform: "none",
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "#F1F5F9" },
                  }}
                >
                  Detalles
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + 1} align="center">
                <Typography color="textSecondary" sx={{ py: 2 }}>No se encontraron resultados.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}

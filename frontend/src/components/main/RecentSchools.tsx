"use client";

import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Link from "next/link";
import { mockSchools } from "./sampleData";
import { getStatusColor, getStatusTextColor } from "./themeFunctions";

export default function RecentSchoolsTable() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      {/* Recent Schools Section */}
      <Box sx={{ marginBottom: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#1c3661",
            }}
          >
            Escuelas Recientes
          </Typography>
          <Link href="/escuelas" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary" size="small">
              Ver Todo
            </Button>
          </Link>
        </Box>

        <TableContainer
          component={Paper}
          sx={{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: "#f8fafb" }}>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "13px",
                  }}
                >
                  Nombre de la Escuela
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "13px",
                  }}
                >
                  Región
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "13px",
                  }}
                >
                  Estado
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "13px",
                  }}
                >
                  Progreso
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockSchools.map((school) => (
                <TableRow
                  key={school.id}
                  sx={{
                    "&:hover": {
                      backgroundColor: "#f8fafb",
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{school.name}</TableCell>
                  <TableCell sx={{ color: "#4a5f8f", fontSize: "14px" }}>
                    {school.region}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={school.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(school.status),
                        color: getStatusTextColor(school.status),
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: "150px" }}>
                    <LinearProgress
                      variant="determinate"
                      value={school.progress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#e5e7eb",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#10b981",
                          borderRadius: 4,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{ color: theme.palette.primary.main, fontSize: "12px" }}
                  >
                    <Link
                      href="#"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      Ver →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

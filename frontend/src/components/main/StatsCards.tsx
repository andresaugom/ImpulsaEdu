"use client";

import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSchools } from "../../lib/schoolsService";
import { fetchDonors } from "../../lib/donorsService";
import { fetchDonations } from "../../lib/donationsService";
import { pendingDeliveries } from "../../lib/reportsService";

export default function MainCards() {
  const theme = useTheme();
  const [totalSchools, setTotalSchools] = useState<number | null>(null);
  const [totalDonors, setTotalDonors] = useState<number | null>(null);
  const [totalDonations, setTotalDonations] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetchSchools({ per_page: 1 }),
      fetchDonors({ per_page: 1 }),
      fetchDonations({ per_page: 1 }),
      pendingDeliveries(),
    ]).then(([schoolsRes, donorsRes, donationsRes, pendingRes]) => {
      if (schoolsRes.status === "fulfilled") setTotalSchools(schoolsRes.value.total);
      if (donorsRes.status === "fulfilled") setTotalDonors(donorsRes.value.total);
      if (donationsRes.status === "fulfilled") setTotalDonations(donationsRes.value.total);
      if (pendingRes.status === "fulfilled") setPendingCount(pendingRes.value.length);
    });
  }, []);

  const fmt = (n: number | null) => (n === null ? "—" : n);

  return (
    <>
      {/* Stats Cards */}
      <Grid
        container
        spacing={3}
        sx={{
          marginBottom: 4,
        }}
      >
        {/* Schools Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1c3661",
                  }}
                >
                  Escuelas Activas
                </Typography>
                <Chip
                  label="En Progreso"
                  size="small"
                  sx={{
                    backgroundColor: "#66cc99",
                    color: "#004411",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ marginBottom: 1.5 }}>
                  <Typography sx={{ fontSize: "12px", color: "#4a5f8f" }}>
                    Escuelas Totales
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                    }}
                  >
                    {fmt(totalSchools)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Link
                href="/escuelas"
                style={{ textDecoration: "none", width: "100%" }}
              >
                <Button
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  Gestionar Escuelas →
                </Button>
              </Link>
            </CardActions>
          </Card>
        </Grid>

        {/* Donors Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1c3661",
                  }}
                >
                  Donantes Activos
                </Typography>
                <Chip
                  label="Activo"
                  size="small"
                  sx={{
                    backgroundColor: "#d1fae5",
                    color: "#004411",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ marginBottom: 1.5 }}>
                  <Typography sx={{ fontSize: "12px", color: "#4a5f8f" }}>
                    Total de Donantes
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                    }}
                  >
                    {fmt(totalDonors)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Link
                href="/donantes"
                style={{ textDecoration: "none", width: "100%" }}
              >
                <Button
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  Gestionar Donantes →
                </Button>
              </Link>
            </CardActions>
          </Card>
        </Grid>

        {/* Donations Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 2,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1c3661",
                  }}
                >
                  Donaciones Activas
                </Typography>
                <Chip
                  label="En Progreso"
                  size="small"
                  sx={{
                    backgroundColor: "#f7ac47",
                    color: "#9c3a0b",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ marginBottom: 1.5 }}>
                  <Typography sx={{ fontSize: "12px", color: "#4a5f8f" }}>
                    Donaciones Totales
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                    }}
                  >
                    {fmt(totalDonations)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "12px", color: "#4a5f8f" }}>
                    Pendientes de Entrega
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                    }}
                  >
                    {fmt(pendingCount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Link
                href="/donaciones"
                style={{ textDecoration: "none", width: "100%" }}
              >
                <Button
                  size="small"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  Gestionar Donaciones →
                </Button>
              </Link>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

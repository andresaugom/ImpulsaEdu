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
  useMediaQuery,
} from "@mui/material";
import Link from "next/link";

export default function MainCards() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
                    12
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "12px", color: "#4a5f8f" }}>
                    Financiadas Este Mes
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                    }}
                  >
                    3
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
                    8
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "12px", color: "#4a5f8f" }}>
                    Nuevos Este Mes
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                    }}
                  >
                    5
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
                    45
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
                    8
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

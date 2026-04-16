"use client";

import { Box, Typography, useTheme, useMediaQuery } from "@mui/material";
import MainCards from "./StatsCards";
import RecentSchoolsTable from "./RecentSchools";
import RecentDonationsTable from "./RecentDonations";

export default function DashboardPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box>
      {/* Welcome Section */}
      <Box sx={{ marginBottom: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            marginBottom: 1,
            color: "#1c3661",
          }}
        >
          Bienvenido, Juan
        </Typography>
        <Typography sx={{ color: "#4a5f8f" }}>
          Aquí tienes una descripción general de tus donaciones y escuelas
        </Typography>
      </Box>

      {/* Main Stats Cards */}
      <MainCards />

      {/* Recent Schools Section */}
      <RecentSchoolsTable />

      {/* Recent Donations Section */}
      <RecentDonationsTable />
    </Box>
  );
}

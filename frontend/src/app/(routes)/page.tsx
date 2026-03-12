'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Typography, Box, Card, CardContent } from '@mui/material';

import MainDashboard from "@/components/main/MainDashboard";

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState("yes");

  return (
    <Box gap={2} sx={{mt:4}} >
        <MainDashboard />
    </Box>
  );

  /*

  if (user === undefined) {
    return (
      <Box gap={2} sx={{mt:4}} >
          <MainDashboard />
      </Box>
    );
  }

  return (
        <Box
      sx={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
        backgroundSize: "400% 400%",
        animation: "gradient 15s ease infinite",
      }}
    >
      <Card
        elevation={9} // Matches the login card elevation
        sx={{ p: 4, zIndex: 1, width: "100%", maxWidth: "500px", textAlign: "center" }}
      >
        <CardContent>
          <Typography variant="h2" fontWeight={700} mb={1}>
            Bienvenido a
          </Typography>
          <Typography variant="h2" textAlign="center" color="textSecondary" mb={3}>
            Nulen POS Administrativo
          </Typography>
          <Typography variant="body1" paragraph color="textSecondary">
            Acceda su cuenta para continuar.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2, width: "80%" }}
            onClick={() => router.push("/authentication")}
          >
            Ir a la página de inicio de sesión
          </Button>
        </CardContent>
      </Card>
    </Box>
  ); */
}

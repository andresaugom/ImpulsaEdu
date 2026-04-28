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
  CircularProgress,
} from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDonations, ApiDonationSummary } from "../../lib/donationsService";
import { getStatusColor, getStatusTextColor, getDonationStateLabel } from "./themeFunctions";

export default function RecentDonationsTable() {
  const [donations, setDonations] = useState<ApiDonationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations({ per_page: 5 })
      .then(({ items }) => setDonations(items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Recent Donations Section */}
      <Box>
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
            Donaciones Recientes
          </Typography>
          <Link href="/donaciones" style={{ textDecoration: "none" }}>
            <Button variant="contained" color="primary" size="small">
              Ver Todo
            </Button>
          </Link>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            sx={{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}
          >
            <Table>
              <TableHead sx={{ backgroundColor: "#f8fafb" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>
                    ID de Donación
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>
                    Donante
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>
                    Escuela
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>
                    Tipo
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>
                    Valor
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {donations.map((donation) => (
                  <TableRow
                    key={donation.id}
                    sx={{ "&:hover": { backgroundColor: "#f8fafb" } }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{donation.id}</TableCell>
                    <TableCell sx={{ color: "#4a5f8f", fontSize: "14px" }}>
                      {donation.donor.name}
                    </TableCell>
                    <TableCell sx={{ color: "#4a5f8f", fontSize: "14px" }}>
                      {donation.school.name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={donation.donation_type === "Monetaria" ? "Monetaria" : "Material"}
                        size="small"
                        sx={{
                          backgroundColor: "#dbeafe",
                          color: "#0c2d6b",
                          fontWeight: 600,
                          fontSize: "12px",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getDonationStateLabel(donation.status)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(donation.status),
                          color: getStatusTextColor(donation.status),
                          fontWeight: 600,
                          fontSize: "12px",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {donation.amount != null
                        ? `$${donation.amount.toLocaleString()}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  ReceiptLongOutlined,
  InventoryOutlined,
  SecurityOutlined,
} from '@mui/icons-material';

interface NavigationCard {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  hoverColor: string;
}

const navigationCards: NavigationCard[] = [
  {
    title: 'Ventas',
    description: 'Gestiona tus ventas, tickets y reportes',
    icon: ReceiptLongOutlined,
    href: '/ventas',
    color: '#0B4595',
    hoverColor: '#014196',
  },
  {
    title: 'Inventario',
    description: 'Controla tu stock y productos',
    icon: InventoryOutlined,
    href: '/inventario',
    color: '#0B4595',
    hoverColor: '#014196',
  },
  {
    title: 'Auditoría',
    description: 'Revisa el historial de actividades',
    icon: SecurityOutlined,
    href: '/auditoria',
    color: '#0B4595',
    hoverColor: '#014196',
  },
];

export default function MainDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');

  useEffect(() => {
    setUserName('Usuario');

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Buenos días');
    } else if (hour < 19) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F1F5F9',
        padding: 4,
      }}
    >
        <h1>Bienvenido a ImpulsaEdu</h1>
    </Box>
  );
}

import {
    HomeOutlined,
    InventoryOutlined,
    LocalShippingOutlined,
    SettingsOutlined,
    AccountCircle,
    SchoolOutlined,
    VolunteerActivismOutlined
  } from '@mui/icons-material';
  import {
    Box,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Button,
  } from '@mui/material';
  import Link from 'next/link';
  import { usePathname } from 'next/navigation';
  
  
  const navItems = [
    { icon: HomeOutlined, text: 'Panel', href: '/' },
    { icon: SchoolOutlined, text: 'Gestión de Escuelas', href: '/escuelas' },
    { icon: VolunteerActivismOutlined, text: 'Gestión de Donantes', href: '/donantes' },
    { icon: InventoryOutlined, text: 'Donaciones', href: '/donaciones' },
    { icon: SettingsOutlined, text: 'Preferencias', href: '/preferencias' },
    { icon: AccountCircle, text: 'Login', href: '/login' },
  ];
  
  const AdminSidebar = () => {
    const pathname = usePathname();
  
    return (
      <Box
        component="nav"
        sx={{
          width: 240,
          height: '100vh',
          backgroundColor: '#0c3011',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          padding: 2,
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1100,
          boxShadow: '2px 0 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Top section */}
        <Typography
          variant="h6"
          sx={{
            mt: 1,
            mb: 3,
            fontWeight: 'bold',
            textAlign: 'center',
            letterSpacing: 1,
            color: '#F8FAFC',
          }}
        >
          Panel Admin
        </Typography>
  
        {/* Navigation */}
        <Box sx={{ flexGrow: 1 }}>
          <List sx={{ mt: 3, "& a": { textDecoration: "none", color: "inherit",}, }}>
            {navItems.map(({ icon: Icon, text, href }) => (
              <Link href={href} key={text} passHref>
                <ListItemButton
                  selected={pathname != href}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    paddingY: 1.2,
                    color: '#F8FAFC',
                    backgroundColor: '#009933', 
                    '&:hover': {
                      backgroundColor: '#006622',
                    },
                  }} 
                >
                  <ListItemIcon sx={{ color: '#F8FAFC', minWidth: 36 }}>
                    <Icon fontSize="medium" />
                  </ListItemIcon>
                  <ListItemText
                    primary={text}
                    primaryTypographyProps={{ fontSize: 15, fontWeight: 500, color: '#F8FAFC' }}
                  />
                </ListItemButton>
              </Link>
            ))}
          </List>
        </Box>
  
        {/* Bottom section */}
        <Box sx={{ mt: 1, textAlign: 'center', mb:1 }}>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>
            ImpulsaEdu
          </Typography>
          <Link href={'/opinion'} >
            <Button
              variant="outlined"
              size="small"
              sx={{
                borderColor: '#94A3B8',
                color: '#94A3B8',
                textTransform: 'none',
                fontSize: 12,
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#F8FAFC',
                  color: '#F8FAFC',
                }
              }}
            >
              Compartir Opinión
            </Button>
          </Link>
        </Box>
        
      </Box>
    );
  };
  
  export default AdminSidebar;
  
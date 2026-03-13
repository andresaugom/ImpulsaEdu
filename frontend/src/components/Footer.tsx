
'use client';
import React from 'react';
import { Box, Typography } from '@mui/material';
import Link from 'next/link';

const Footer: React.FC = () => {
    return (
        <footer className="footer" style={{ textAlign: 'center', fontSize: '0.8em', marginTop: "2rem", marginBottom: "2rem"}}>
            <div className="footer-content">
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 2 }}>
                    <Link href="/" passHref>
                        <Typography variant="body2" sx={{ cursor: 'pointer', color: '#1c3661', '&:hover': { color: '#009933' } }}>
                        Inicio
                        </Typography>
                    </Link>
                    <Link href="/terminos" passHref>
                        <Typography variant="body2" sx={{ cursor: 'pointer', color: '#1c3661', '&:hover': { color: '#009933' } }}>
                            Terminos de servicio
                        </Typography>
                    </Link>
                    <Link href="/privacidad" passHref>
                        <Typography variant="body2" sx={{ cursor: 'pointer', color: '#1c3661', '&:hover': { color: '#009933' } }}>
                            Aviso de privacidad
                        </Typography>
                    </Link>
                    <Link href="/contacto" passHref>
                        <Typography variant="body2" sx={{ cursor: 'pointer', color: '#1c3661', '&:hover': { color: '#009933' } }}>
                            Contacto
                        </Typography>
                    </Link>
                </Box>
                {/*
                <p>&copy; {new Date().getFullYear()} Nulen. Todos los derechos reservados.</p>
                <p>nulen_soluciones@gmail.com</p>
                */}
            </div>
        </footer>
    );
};

export default Footer;
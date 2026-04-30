'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, Typography, Skeleton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { fetchSchoolImages } from '@/lib/imagesService';

const CAROUSEL_HEIGHT = 200;
const AUTO_SLIDE_INTERVAL_MS = 2500;
const PLACEHOLDER_COLOR = '#e5e7eb';

interface SchoolImageCarouselProps {
  cct: string;
}

export default function SchoolImageCarousel({ cct }: SchoolImageCarouselProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const isHoveredRef = useRef(false);
  const isManualNavRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref in sync with images state so interval callbacks always see current count
  const imagesRef = useRef<string[]>([]);

  const clearAutoSlide = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoSlide = useCallback((imageCount: number) => {
    clearAutoSlide();
    if (imageCount < 2) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageCount);
    }, AUTO_SLIDE_INTERVAL_MS);
  }, [clearAutoSlide]);

  // Sync ref with state
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Start/stop auto-slide based on hover + image availability
  useEffect(() => {
    if (fetched && !loading && isHoveredRef.current && !isManualNavRef.current && images.length >= 2) {
      startAutoSlide(images.length);
    }
    // Cleanup on unmount
    return () => {
      if (!isHoveredRef.current) clearAutoSlide();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetched, loading, images.length]);

  useEffect(() => {
    return () => clearAutoSlide();
  }, [clearAutoSlide]);

  const loadImages = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    setFetched(true);
    const urls = await fetchSchoolImages(cct);
    setImages(urls);
    setLoading(false);
  }, [cct, fetched]);

  const handleMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
    isManualNavRef.current = false;
    loadImages();
    // If images are already loaded, start auto-slide immediately
    if (fetched && !loading && imagesRef.current.length >= 2) {
      startAutoSlide(imagesRef.current.length);
    }
  }, [loadImages, fetched, loading, startAutoSlide]);

  const handleMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    isManualNavRef.current = false;
    clearAutoSlide();
  }, [clearAutoSlide]);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const total = imagesRef.current.length;
    if (total === 0) return;
    isManualNavRef.current = true;
    clearAutoSlide();
    setCurrentIndex((prev) => ((prev - 1) + total) % total);
  }, [clearAutoSlide]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const total = imagesRef.current.length;
    if (total === 0) return;
    isManualNavRef.current = true;
    clearAutoSlide();
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [clearAutoSlide]);

  const showPlaceholder = fetched && !loading && images.length === 0;

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'relative',
        width: '100%',
        height: CAROUSEL_HEIGHT,
        overflow: 'hidden',
        backgroundColor: PLACEHOLDER_COLOR,
        '&:hover .carousel-arrow': { opacity: 1 },
      }}
    >
      {loading && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height={CAROUSEL_HEIGHT}
          animation="wave"
        />
      )}

      {!loading && images.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={images[currentIndex]}
          src={images[currentIndex]}
          alt={`Imagen ${currentIndex + 1}`}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {(!fetched || showPlaceholder) && !loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: PLACEHOLDER_COLOR,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            {fetched ? 'Sin imágenes' : ''}
          </Typography>
        </Box>
      )}

      {/* Left arrow */}
      {images.length > 1 && (
        <IconButton
          className="carousel-arrow"
          onClick={handlePrev}
          size="small"
          aria-label="Imagen anterior"
          sx={{
            position: 'absolute',
            left: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0,0,0,0.45)',
            color: 'white',
            opacity: 0.6,
            transition: 'opacity 0.2s',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.65)' },
            padding: '2px',
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}

      {/* Right arrow */}
      {images.length > 1 && (
        <IconButton
          className="carousel-arrow"
          onClick={handleNext}
          size="small"
          aria-label="Siguiente imagen"
          sx={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0,0,0,0.45)',
            color: 'white',
            opacity: 0.6,
            transition: 'opacity 0.2s',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.65)' },
            padding: '2px',
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: 'white',
            borderRadius: '10px',
            padding: '1px 7px',
            fontSize: '0.7rem',
            lineHeight: 1.6,
            pointerEvents: 'none',
          }}
        >
          {currentIndex + 1}/{images.length}
        </Box>
      )}
    </Box>
  );
}

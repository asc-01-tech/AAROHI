// components/MotionProvider.tsx
// LazyMotion wrapper with domMax features (required for drag).
// Loads async via dynamic import to keep the bundle small.
// All animated components use the `m` prefix, NOT `motion`.
'use client';

import { LazyMotion, domMax } from 'framer-motion';
import React from 'react';

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}


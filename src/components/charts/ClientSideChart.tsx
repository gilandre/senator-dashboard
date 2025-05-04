"use client";

import React from 'react';

// This is a client-side wrapper for any chart components
export default function ClientSideChart({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 
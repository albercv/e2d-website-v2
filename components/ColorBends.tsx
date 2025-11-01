"use client"

import ColorBendsBase from './ColorBendsBase';
import type { CSSProperties } from 'react';

export type ColorBendsProps = {
  className?: string;
  style?: CSSProperties;
  rotation?: number;
  speed?: number;
  colors?: string[];
  transparent?: boolean;
  autoRotate?: number;
  scale?: number;
  frequency?: number;
  warpStrength?: number;
  mouseInfluence?: number;
  parallax?: number;
  noise?: number;
  globalPointer?: boolean;
};

export default function ColorBends(props: ColorBendsProps) {
  return <ColorBendsBase {...props} />;
}
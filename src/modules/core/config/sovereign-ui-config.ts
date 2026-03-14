/**
 * [Sovereign UI] Core Brand Protocol
 * Defines the absolute visual standards for the Rapallo ecosystem.
 * These colors represent commercial authority and precision.
 */

export const SOVEREIGN_COLORS = {
  // Pitch Black: The foundation of the UI, representing depth and stability.
  PITCH_BLACK: '#050505',
  
  // Holographic Purple: The core accent for AI and evolution.
  HOLOGRAPHIC_PURPLE: '#a855f7',
  
  // Financial Green: The color of success and balanced accounts.
  FINANCIAL_GREEN: '#10b981',
  
  // Sovereign Zinc: High-density information text color.
  SOVEREIGN_ZINC: '#71717a',
  
  // Accents and Gradients
  GLOW_PURPLE: 'rgba(168, 85, 247, 0.5)',
  GLOW_GREEN: 'rgba(16, 185, 129, 0.5)',
} as const;

export type SovereignColor = keyof typeof SOVEREIGN_COLORS;

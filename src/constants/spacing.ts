// Spacing constants for consistent layout
export const spacing = {
  // Base spacing units
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
  '5xl': '8rem',   // 128px
  
  // Component-specific spacing
  card: {
    padding: '1.5rem',
    gap: '1rem',
    borderRadius: '1rem',
  },
  
  button: {
    padding: '0.75rem 1.5rem',
    gap: '0.5rem',
    borderRadius: '0.5rem',
  },
  
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
  },
  
  table: {
    padding: '1rem',
    gap: '0.5rem',
  },
  
  sidebar: {
    width: '20rem',
    padding: '1.5rem',
    gap: '0.75rem',
  },
  
  header: {
    height: '4rem',
    padding: '1rem 1.5rem',
  },
  
  // Layout spacing
  layout: {
    container: '1.5rem',
    section: '2rem',
    page: '2rem',
  },
  
  // Grid spacing
  grid: {
    gap: '1.5rem',
    gapSm: '1rem',
    gapLg: '2rem',
  },
  
  // Stack spacing
  stack: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
} as const;

export type Spacing = typeof spacing; 
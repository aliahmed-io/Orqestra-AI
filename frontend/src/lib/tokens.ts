/**
 * Orqestra AI Design Tokens
 * Strictly derived from the Orqestra AI Visual Identity specification.
 */

export interface ColorTokens {
  porcelain: string;
  porcelainElevated: string;
  porcelainRecessed: string;
  indigo: string;
  indigoHover: string;
  indigoSubtle: string;
  softSlate: string;
  softSlateBorder: string;
  apricot: string;
  apricotSubtle: string;
  ink: string;
  inkMuted: string;
  hairline: string;
  success: string;
  danger: string;
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface TypographyTokens {
  displayFamily: string;
  bodyFamily: string;
  monoFamily: string;
}

export interface RadiusTokens {
  sm: string;
  md: string;
  lg: string;
  pill: string;
}

export interface MotionTokens {
  fastMs: number;
  normalMs: number;
  easing: readonly [number, number, number, number];
}

export const ORQESTRA_TOKENS: {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  radii: RadiusTokens;
  motion: MotionTokens;
} = {
  colors: {
    porcelain: "#F5F3EE",
    porcelainElevated: "#FFFFFF",
    porcelainRecessed: "#ECE8DF",
    indigo: "#354D8A",
    indigoHover: "#2A3E70",
    indigoSubtle: "#EBF0F9",
    softSlate: "#A9B6CE",
    softSlateBorder: "#D4DCE8",
    apricot: "#ED9D78",
    apricotSubtle: "#FDF1EB",
    ink: "#242B3A",
    inkMuted: "#5A657A",
    hairline: "#E2DDD3",
    success: "#2E7D5B",
    danger: "#C04A3E",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  typography: {
    displayFamily: "var(--font-manrope), sans-serif",
    bodyFamily: "var(--font-inter), sans-serif",
    monoFamily: "var(--font-ibm-plex-mono), monospace",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    pill: "9999px",
  },
  motion: {
    fastMs: 160,
    normalMs: 260,
    easing: [0.22, 1, 0.36, 1],
  },
};

"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ReactNode } from "react"

// Define our own type for the theme provider props
interface ThemeProviderProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  [prop: string]: any;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
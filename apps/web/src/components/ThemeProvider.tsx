"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "galaxy";

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; }
export const ThemeContext = createContext<ThemeCtx>({ theme: "light", setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("purleads-theme") as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "galaxy") setThemeState(saved);
  }, []);

  function setTheme(t: Theme) {
    localStorage.setItem("purleads-theme", t);
    setThemeState(t);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

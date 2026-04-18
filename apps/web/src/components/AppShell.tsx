"use client";
import { Sidebar } from "./Sidebar";
import { StarField } from "./StarField";
import { ThemeProvider, useTheme } from "./ThemeProvider";

const BG: Record<string, string> = {
  light: "#ffffff",
  dark: "#0f0e1a",
  galaxy: "#06041a",
};

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "galaxy";
  const bg = BG[theme];

  return (
    <div className="flex min-h-screen" style={{ background: bg }}>
      <Sidebar />
      <main className="flex-1 overflow-auto relative" style={{ background: bg }}>
        {theme === "galaxy" && <StarField />}
        <div className={isDark ? "relative z-10 app-dark-content" : "app-content"}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShellInner>{children}</AppShellInner>
    </ThemeProvider>
  );
}

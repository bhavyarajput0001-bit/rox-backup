// Theme configuration for Rox

export type Theme = "amber" | "lava" | "dark";

export const themes: Record<Theme, { label: string; cssClass: string }> = {
  amber: { label: "Amber / Gold", cssClass: "theme-amber" },
  lava: { label: "Lava Red", cssClass: "theme-lava" },
  dark: { label: "Dark Cyan", cssClass: "theme-dark" },
};

export function applyTheme(theme: Theme): void {
  document.body.className = theme === "amber" ? "" : `palette-${theme}`;
  localStorage.setItem("rox_theme", theme);
}

export function getTheme(): Theme {
  const stored = localStorage.getItem("rox_theme") as Theme | null;
  return stored || "amber";
}

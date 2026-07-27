/**
 * ECharts renders to canvas, so it can't read CSS custom properties directly.
 * These mirror the text/border tokens in globals.css per theme so chart labels
 * stay legible in both light and dark mode instead of the old dark-only hardcoded slate colors.
 */
export function getChartColors(theme: "dark" | "light") {
  return {
    text: theme === "dark" ? "#ABA39D" : "#555555",
    textMuted: theme === "dark" ? "#6E665F" : "#999999",
    emphasisText: theme === "dark" ? "#F2ECE6" : "#111111",
    axisLine: theme === "dark" ? "rgba(255, 240, 230, 0.22)" : "#D4D4D4",
    splitLine: theme === "dark" ? "rgba(255, 240, 230, 0.10)" : "#E5E5E5",
    ringGap: theme === "dark" ? "#38312A" : "#FFFFFF",
    /** Matches --th-brand-accent per theme (globals.css) — warm ember in dark, MMC red in light. */
    accent: theme === "dark" ? "#FF5A40" : "#ED0000",
  };
}

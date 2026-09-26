import { useSyncExternalStore } from "react";

// The active theme ("light" or "dark"), kept in sync with ThemeToggle, which
// sets <html data-theme>.
function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}

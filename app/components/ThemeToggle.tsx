"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label="切換主題"
      className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-sm transition-colors hover:border-[var(--primary)]"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

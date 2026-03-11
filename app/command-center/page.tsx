import type { Metadata } from "next";
import { Suspense } from "react";
import Dashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Command Center — 投資戰情室",
};

export default function CommandCenterPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

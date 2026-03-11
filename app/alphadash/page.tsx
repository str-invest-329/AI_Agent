import type { Metadata } from "next";
import AlphaDashboard from "./dashboard";

export const metadata: Metadata = {
  title: "AlphaDash — 財務系統儀表板",
};

export default function AlphaDashPage() {
  return <AlphaDashboard />;
}

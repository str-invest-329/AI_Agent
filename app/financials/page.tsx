import type { Metadata } from "next";
import { Suspense } from "react";
import Viewer from "./viewer";

export const metadata: Metadata = {
  title: "Financials Viewer — 財務報表瀏覽器",
};

export default function FinancialsPage() {
  return (
    <Suspense>
      <Viewer />
    </Suspense>
  );
}

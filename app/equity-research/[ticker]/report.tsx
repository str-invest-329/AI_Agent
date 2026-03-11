"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";

/* ================================================================
   Types — matches the JSON schema
   ================================================================ */
interface Source {
  label: string;
  href: string;
}

interface TableData {
  headers: string[];
  alignRight?: number[];
  rows: string[][];
}

interface ImageData {
  src: string;
  alt: string;
}

interface BulletList {
  items: string[];
}

interface Block {
  type: "content-box";
  title?: string;
  paragraphs?: string[];
  table?: TableData;
  image?: ImageData;
  bullets?: BulletList;
  footnote?: string;
  sources?: Source[];
}

interface Section {
  id: string;
  title: string;
  kvCards?: { label: string; value: string; sub?: string; valueClass?: string }[];
  blocks: Block[];
}

interface QuarterEPS {
  label: string;
  bear: number;
  base: number;
  bull: number;
  isActual: boolean;
}

interface ValuationVersion {
  id: string;
  date: string;
  label: string;
  trigger: string;
  note: string;
  details?: string[];
  peRatios: [number, number, number, number];
  eps: { bear: number; base: number; bull: number; ttm: number };
  quarterly: QuarterEPS[];
}

interface ValuationModel {
  type: string;
  title: string;
  placeholder?: string;
  // PE-specific fields
  peLabels?: string[];
  versions?: ValuationVersion[];
}

interface Chronicle {
  title: string;
  description: string;
  href: string;
  linkLabel?: string;
}

interface Chapter {
  id: string;
  title: string;
  numeral: string;
  sections: Section[];
  placeholder?: string;
  chronicle?: Chronicle;
  valuations?: ValuationModel[];
}

export interface ReportData {
  ticker: string;
  name: string;
  market: string;
  updated: string;
  chapters: Chapter[];
}

/* ================================================================
   Sub-components
   ================================================================ */
const TH =
  "border-b border-[var(--border)] px-4 py-2 text-left text-xs font-normal uppercase tracking-wide text-[var(--text-muted)]";
const TH_R = TH + " text-right";
const TD = "border-b border-[var(--border)] px-4 py-2 text-sm";
const TD_R = TD + " text-right tabular-nums";

function Sources({ list }: { list: Source[] }) {
  if (!list?.length) return null;
  return (
    <div className="mt-2 text-xs text-[var(--text-faint)]">
      Sources:
      <ul className="mt-1 space-y-0.5">
        {list.map((s, i) => (
          <li key={i}>
            [
            <a
              href={s.href}
              target="_blank"
              rel="noopener"
              className="text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline"
            >
              {s.label}
            </a>
            ]
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm">
      {title && (
        <h3 className="mb-3 border-b border-[#F0EAEA] pb-1.5 text-[0.95rem] font-semibold">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function KvCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueClass ?? ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[#6B5E60]">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 border-l-[3px] border-[var(--primary)] pl-3 text-lg font-semibold uppercase tracking-wider text-[var(--primary)]">
      {children}
    </div>
  );
}

function SideToc({
  chapters,
  activeId,
}: {
  chapters: Chapter[];
  activeId: string;
}) {
  const items: { id: string; label: string; isChapter: boolean }[] = [];
  for (const ch of chapters) {
    items.push({ id: ch.id, label: `${ch.numeral}. ${ch.title}`, isChapter: true });
    for (const sec of ch.sections) {
      items.push({ id: sec.id, label: sec.title.replace(/^\d+\s*·\s*/, ""), isChapter: false });
    }
  }

  return (
    <nav
      className="fixed top-1/2 z-50 hidden w-[180px] -translate-y-1/2 text-xs leading-relaxed min-[1440px]:block"
      style={{ right: "calc((100vw - 960px) / 2 - 200px)" }}
    >
      <ul className="border-l-2 border-[var(--border)]">
        {items.map((s) => {
          const isActive = activeId === s.id;
          return (
            <li
              key={s.id}
              className={`${
                s.isChapter
                  ? "pt-2.5 pl-3 font-semibold first:pt-1"
                  : "pl-5 font-normal"
              } py-1 ${isActive ? "-ml-0.5 border-l-2 border-[var(--primary)]" : ""}`}
            >
              <a
                href={`#${s.id}`}
                className={`transition-colors ${
                  isActive
                    ? "font-semibold text-[var(--primary)]"
                    : s.isChapter
                      ? "text-[var(--text)] hover:text-[var(--primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--primary)]"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ================================================================
   Inline Markdown — minimal bold / italic / bold-italic support
   ================================================================ */
function renderInline(text: string): ReactNode {
  // Split by **bold**, __underline-bold__, *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <strong key={i} className="border-t-2 border-[var(--border)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/* ================================================================
   Block Renderer — renders a single block from JSON
   ================================================================ */
function BlockRenderer({
  block,
  onImageClick,
}: {
  block: Block;
  onImageClick: (src: string) => void;
}) {
  return (
    <ContentBox title={block.title}>
      {/* Image */}
      {block.image && (
        <div
          className="relative my-2 cursor-zoom-in"
          onClick={() => onImageClick(block.image!.src)}
        >
          <img
            src={block.image.src}
            alt={block.image.alt}
            className="w-full rounded-lg"
          />
          <span className="absolute bottom-1 right-2 pointer-events-none text-[0.68rem] text-[var(--text-faint)]">
            click to expand
          </span>
        </div>
      )}

      {/* Table */}
      {block.table && (
        <div className="overflow-x-auto">
          <table className="mb-3 w-full border-collapse">
            <thead>
              <tr>
                {block.table.headers.map((h, i) => (
                  <th
                    key={i}
                    className={block.table!.alignRight?.includes(i) ? TH_R : TH}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.table.rows.map((row, ri) => {
                const isTotal = row[0]?.startsWith("__");
                return (
                  <tr
                    key={ri}
                    className={isTotal ? "border-t-2 border-[var(--border)] font-semibold" : ""}
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={block.table!.alignRight?.includes(ci) ? TD_R : TD}
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bullets */}
      {block.bullets && (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
          {block.bullets.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      )}

      {/* Paragraphs */}
      {block.paragraphs?.map((p, i) => (
        <p key={i} className="mb-3 text-sm">
          {renderInline(p)}
        </p>
      ))}

      {/* Footnote */}
      {block.footnote && (
        <div className="text-xs text-[var(--text-faint)]">{block.footnote}</div>
      )}

      {/* Sources */}
      {block.sources && <Sources list={block.sources} />}
    </ContentBox>
  );
}

/* ================================================================
   Lightbox
   ================================================================ */
function LightboxModal({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-[rgba(44,21,23,0.55)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-[85vw] max-w-[1200px] cursor-default overflow-auto rounded-xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt="Expanded view" className="w-full" />
      </div>
    </div>
  );
}

/* ================================================================
   Valuation Components
   ================================================================ */
const EPS_LABELS = ["悲觀估值", "中間估值", "樂觀估值", "TTM\n(剔除一次性)"] as const;

function PEGrid({
  v,
  peLabels,
  currentPrice,
}: {
  v: ValuationVersion;
  peLabels: string[];
  currentPrice?: number | null;
}) {
  const epsRows: { label: string; value: number }[] = [
    { label: "悲觀估值", value: v.eps.bear },
    { label: "中間估值", value: v.eps.base },
    { label: "樂觀估值", value: v.eps.bull },
    { label: "TTM (剔除一次性)", value: v.eps.ttm },
  ];

  // Find the two cells that bracket the current price (one ≤, one ≥)
  // If price is outside the range, only one cell flashes
  const breatheKeys = new Set<string>();
  if (currentPrice && currentPrice > 0) {
    const allCells: { key: string; price: number }[] = [];
    epsRows.forEach((row, ri) => {
      v.peRatios.forEach((pe, ci) => {
        allCells.push({ key: `${ri}-${ci}`, price: row.value * pe });
      });
    });

    // Sort by target price
    const sorted = [...allCells].sort((a, b) => a.price - b.price);

    // Find floor (highest price ≤ currentPrice) and ceiling (lowest price ≥ currentPrice)
    let floor: typeof sorted[0] | null = null;
    let ceiling: typeof sorted[0] | null = null;
    for (const c of sorted) {
      if (c.price <= currentPrice) floor = c;
    }
    for (const c of sorted) {
      if (c.price >= currentPrice && !ceiling) ceiling = c;
    }

    if (floor) breatheKeys.add(floor.key);
    if (ceiling && ceiling.key !== floor?.key) breatheKeys.add(ceiling.key);
    // If no floor (price below all), just ceiling; if no ceiling (price above all), just floor
    if (!floor && ceiling) breatheKeys.add(ceiling.key);
    if (!ceiling && floor) breatheKeys.add(floor.key);
  }

  const cell =
    "border border-[var(--border)] px-3 py-2 text-sm text-right tabular-nums";
  const hdr =
    "border border-[var(--border)] px-3 py-2 text-xs font-semibold text-center";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${hdr} bg-[#f5f0f0]`} colSpan={2}>
              {v.label}
            </th>
            <th className={`${hdr} bg-[#f5f0f0]`} colSpan={4}>
              P/E Ratio
            </th>
          </tr>
          <tr>
            <th className={`${hdr} bg-[#fafafa]`} colSpan={2}>
              全年 EPS
            </th>
            {peLabels.map((label, i) => (
              <th key={i} className={`${hdr} bg-[#fafafa]`}>
                <div className="text-[0.7rem] text-[var(--text-muted)]">
                  {label}
                </div>
                <div className="mt-0.5 text-sm font-bold">
                  {v.peRatios[i].toFixed(2)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {epsRows.map((row, ri) => (
            <tr key={ri}>
              <td
                className={`${cell} text-left font-medium ${ri === 3 ? "text-xs" : ""}`}
              >
                {row.label}
              </td>
              <td className={`${cell} font-semibold`}>{row.value.toFixed(2)}</td>
              {v.peRatios.map((pe, ci) => {
                const price = (row.value * pe).toFixed(1);
                const isBase = ri === 1 && ci === 2;
                const isBreathe = breatheKeys.has(`${ri}-${ci}`);
                return (
                  <td
                    key={ci}
                    className={`${cell} ${
                      isBase
                        ? "bg-[#FDE7E7] font-bold text-[var(--primary)]"
                        : ""
                    }`}
                    style={
                      isBreathe
                        ? { animation: "breathe 2.5s ease-in-out infinite" }
                        : undefined
                    }
                  >
                    {price}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {currentPrice && (
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          現價 <span className="text-base font-bold text-[var(--primary)]">${currentPrice.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}

function QuarterlyEPS({ v }: { v: ValuationVersion }) {
  const total = {
    bear: v.quarterly.reduce((s, q) => s + q.bear, 0),
    base: v.quarterly.reduce((s, q) => s + q.base, 0),
    bull: v.quarterly.reduce((s, q) => s + q.bull, 0),
  };
  const cell =
    "border border-[var(--border)] px-3 py-2 text-sm text-right tabular-nums";
  const hdr =
    "border border-[var(--border)] px-3 py-2 text-xs font-semibold text-center bg-[#fafafa]";

  const renderRow = (
    label: string,
    bear: number,
    base: number,
    bull: number,
    isActual: boolean,
    isBold = false,
  ) => (
    <tr key={label} className={isBold ? "font-semibold bg-[#fafafa]" : ""}>
      <td
        className={`${cell} text-left ${isBold ? "font-semibold" : "font-medium"}`}
      >
        {label}
      </td>
      <td className={cell}>
        ${bear.toFixed(2)}
        {isActual && !isBold && (
          <span className="ml-1 text-[0.65rem] text-green-600">✓</span>
        )}
      </td>
      <td className={cell}>
        ${base.toFixed(2)}
        {isActual && !isBold && (
          <span className="ml-1 text-[0.65rem] text-green-600">✓</span>
        )}
      </td>
      <td className={cell}>
        ${bull.toFixed(2)}
        {isActual && !isBold && (
          <span className="ml-1 text-[0.65rem] text-green-600">✓</span>
        )}
      </td>
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={hdr}>Quarter</th>
            <th className={hdr}>Bear</th>
            <th className={hdr}>Base</th>
            <th className={hdr}>Bull</th>
          </tr>
        </thead>
        <tbody>
          {v.quarterly.map((q) =>
            renderRow(q.label, q.bear, q.base, q.bull, q.isActual),
          )}
          {renderRow("Total", total.bear, total.base, total.bull, false, true)}
        </tbody>
      </table>
      <p className="mt-1 text-[0.65rem] text-[var(--text-faint)]">
        <span className="text-green-600">✓</span> = 已公布實際值
      </p>
    </div>
  );
}

function VersionHistory({
  versions,
  peLabels,
  openId,
  onToggle,
}: {
  versions: ValuationVersion[];
  peLabels: string[];
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {

  return (
    <div className="space-y-2">
      {versions.map((v) => {
        const isOpen = openId === v.id;
        return (
          <div
            key={v.id}
            className="rounded-lg border border-[var(--border)] bg-white"
          >
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#fdfafa]"
              onClick={() => onToggle(isOpen ? null : v.id)}
            >
              <div>
                <span className="mr-2 font-mono text-xs text-[var(--text-faint)]">
                  {v.id}
                </span>
                <span className="font-semibold">{v.label}</span>
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  {v.date}
                </span>
              </div>
              <span className="text-[var(--text-faint)]">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">
                  觸發事件：{v.trigger}
                </p>
                <p className="mb-4 text-xs text-[var(--text-faint)]">
                  {v.note}
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[var(--text-muted)]">
                      P/E 估值矩陣
                    </p>
                    <PEGrid v={v} peLabels={peLabels} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-[var(--text-muted)]">
                      每季 EPS 預估
                    </p>
                    <QuarterlyEPS v={v} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailsToggle({ details }: { details: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 border-t border-[var(--border)] pt-3">
      <button
        className="flex w-full items-center justify-between text-left text-[0.85rem] font-semibold hover:text-[var(--primary)]"
        onClick={() => setOpen(!open)}
      >
        估值邏輯
        <span className="text-xs text-[var(--text-faint)]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3">
          {details.map((p, i) => (
            <p key={i} className="mb-3 text-sm">
              {renderInline(p)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function PEValuation({
  model,
  ticker,
  currentPrice,
}: {
  model: ValuationModel;
  ticker: string;
  currentPrice: number | null;
}) {
  const versions = model.versions || [];
  const peLabels = model.peLabels || [];
  const latest = versions[0];
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);

  if (!latest) return null;

  return (
    <>
      <ContentBox title={`最新估價 — ${latest.label}`}>
        <div className="mb-1 flex items-baseline gap-3">
          <span className="text-xs font-mono text-[var(--text-faint)]">
            {latest.id}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {latest.date} · {latest.trigger}
          </span>
        </div>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          {latest.note}
        </p>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="mb-1.5 text-xs font-semibold text-[var(--text-muted)]">
              P/E 估值矩陣（目標股價 = EPS × P/E）
            </p>
            <PEGrid
              v={latest}
              peLabels={peLabels}
              currentPrice={currentPrice}
            />
          </div>
          <div className="lg:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-[var(--text-muted)]">
              每季 EPS 預估
            </p>
            <QuarterlyEPS v={latest} />
          </div>
        </div>
        {latest.details && latest.details.length > 0 && (
          <DetailsToggle details={latest.details} />
        )}
      </ContentBox>

      {versions.length > 1 && (
        <ContentBox title="版本紀錄">
          <p className="mb-3 text-xs text-[var(--text-faint)]">
            每次財報公布或重大消息調整估價時，會新增一個版本。展開可查看當時的估價快照。
          </p>
          <VersionHistory
            versions={versions.slice(1)}
            peLabels={peLabels}
            openId={historyOpenId}
            onToggle={setHistoryOpenId}
          />
        </ContentBox>
      )}
    </>
  );
}

function ChronicleCard({ chronicle }: { chronicle: Chronicle }) {
  return (
    <div className="mb-10">
      <SectionTitle>{chronicle.title}</SectionTitle>
      <a
        href={chronicle.href}
        target="_blank"
        rel="noopener"
        className="group block rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm transition-colors hover:border-[var(--primary-lt)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              {chronicle.description}
            </p>
          </div>
          <span className="ml-4 shrink-0 rounded-md bg-[var(--tag-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
            {chronicle.linkLabel || "開啟"} ↗
          </span>
        </div>
      </a>
    </div>
  );
}

function ValuationChapter({
  valuations,
  ticker,
  chronicle,
}: {
  valuations: ValuationModel[];
  ticker: string;
  chronicle?: Chronicle;
}) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/quote?ticker=${ticker}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.price) setCurrentPrice(d.price);
      })
      .catch(() => {});
  }, [ticker]);

  return (
    <>
      {chronicle && <ChronicleCard chronicle={chronicle} />}

      {valuations.map((model, i) => (
        <section key={i} className="mb-10">
          <SectionTitle>{model.title}</SectionTitle>

          {model.type === "pe" && (
            <PEValuation model={model} ticker={ticker} currentPrice={currentPrice} />
          )}

          {model.placeholder && model.type !== "pe" && (
            <ContentBox>
              <p className="p-4 text-center text-sm italic text-[var(--text-faint)]">
                {model.placeholder}
              </p>
            </ContentBox>
          )}
        </section>
      ))}
    </>
  );
}

/* ================================================================
   Main Report Component
   ================================================================ */
export default function Report({ data }: { data: ReportData }) {
  const { ticker, name, updated, chapters } = data;

  // Build flat list of section IDs for scroll tracking
  const allIds: string[] = [];
  for (const ch of chapters) {
    allIds.push(ch.id);
    for (const sec of ch.sections) {
      allIds.push(sec.id);
    }
  }

  const [activeId, setActiveId] = useState(allIds[0] || "");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    const targets = allIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    function onScroll() {
      const offset = window.scrollY + window.innerHeight * 0.25;
      let active = targets[0];
      for (const t of targets) {
        if (t.offsetTop <= offset) active = t;
      }
      if (active) setActiveId(active.id);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openLightbox = useCallback((src: string) => {
    setLightboxImg(src);
  }, []);

  return (
    <div className="mx-auto max-w-[960px] px-6 py-8 pb-16">
      <Link
        href="/equity-research"
        className="mb-3 inline-block text-sm font-semibold text-[var(--primary)] opacity-70 transition-opacity hover:opacity-100"
      >
        ← Equity Research
      </Link>

      {/* Header */}
      <header className="mb-10 border-b border-[var(--border)] pb-5">
        <h1 className="text-3xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">{ticker}</span> 個股研究
        </h1>
        <div className="mt-1 text-sm text-[var(--text-muted)]">
          {name} · 最後更新：{updated}
        </div>
      </header>

      {/* TOC */}
      <nav className="mb-10 rounded-lg border border-[var(--border)] bg-white px-6 py-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          目錄
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {chapters.map((ch) => (
            <li key={ch.id}>
              <a href={`#${ch.id}`} className="hover:text-[var(--primary)] hover:underline">
                {ch.title}
              </a>
              {ch.sections.length > 0 && (
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-[#6B5E60]">
                  {ch.sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="hover:text-[var(--primary)] hover:underline"
                      >
                        {sec.title.replace(/^\d+\s*·\s*/, "")}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Side TOC */}
      <SideToc chapters={chapters} activeId={activeId} />

      {/* Lightbox */}
      <LightboxModal src={lightboxImg} onClose={() => setLightboxImg(null)} />

      {/* Chapters */}
      {chapters.map((ch) => (
        <div key={ch.id} className="mb-16" id={ch.id}>
          <div className="mb-8 border-b-2 border-[var(--primary)] pb-2 text-xl font-bold tracking-wide">
            <span className="text-[var(--primary)]">{ch.numeral}.</span> {ch.title}
          </div>

          {ch.valuations && <ValuationChapter valuations={ch.valuations} ticker={ticker} chronicle={ch.chronicle} />}

          {ch.placeholder && ch.sections.length === 0 && !ch.valuations && (
            <p className="p-4 text-center text-sm italic text-[var(--text-faint)]">
              {ch.placeholder}
            </p>
          )}

          {ch.sections.map((sec) => (
            <section key={sec.id} id={sec.id} className="mb-10">
              <SectionTitle>{sec.title}</SectionTitle>

              {/* KV Cards */}
              {sec.kvCards && sec.kvCards.length > 0 && (
                <div className="mb-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                  {sec.kvCards.map((kv, i) => (
                    <KvCard key={i} {...kv} />
                  ))}
                </div>
              )}

              {/* Blocks */}
              {sec.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} onImageClick={openLightbox} />
              ))}
            </section>
          ))}
        </div>
      ))}

      <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--text-faint)]">
        Equity Research · K-House
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";

/* ================================================================
   Section IDs for scroll-tracking side TOC
   ================================================================ */
const SECTIONS = [
  { id: "ch-fundamental", label: "I. 基本面", isChapter: true },
  { id: "sec-overview", label: "企業概述", isChapter: false },
  { id: "sec-business-model", label: "商業模式", isChapter: false },
  { id: "sec-products", label: "產品", isChapter: false },
  { id: "sec-market", label: "市場規模", isChapter: false },
  { id: "sec-competition", label: "競爭格局", isChapter: false },
  { id: "sec-moat", label: "Moat", isChapter: false },
  { id: "ch-financial", label: "II. 財務面", isChapter: true },
  { id: "ch-flow", label: "III. 籌碼面", isChapter: true },
  { id: "ch-technical", label: "IV. 技術面", isChapter: true },
  { id: "ch-valuation", label: "V. 估值模型", isChapter: true },
];

const MERMAID_BUSINESS_MODEL = `flowchart LR
  subgraph JV["🏭 Kioxia JV<br/>(四日市 + 北上)"]
    FAB["NAND 晶圓製造<br/>3D NAND / BiCS"]
  end

  subgraph SK["🔧 SanDisk"]
    RD["R&D<br/>技術設計"]
    PKG["封裝 / 測試<br/>成品製造"]
  end

  subgraph MKT["📦 終端市場"]
    EDGE["Edge 56%<br/>PC・車用・行動"]
    CONS["Consumer 31%<br/>記憶卡・USB・SSD"]
    DC["Datacenter 13%<br/>企業 SSD・AI 推論"]
  end

  subgraph REV["💰 資金流"]
    OEM["OEM / 零售客戶"]
    REVENUE["營收 $7.4B/年"]
  end

  RD -->|"共同研發"| FAB
  FAB -->|"晶圓分配<br/>(按投資比例)"| PKG
  PKG --> EDGE
  PKG --> CONS
  PKG --> DC
  EDGE --> OEM
  CONS --> OEM
  DC --> OEM
  OEM --> REVENUE
  REVENUE -->|"JV 付款<br/>$291M/年"| FAB
  REVENUE -->|"R&D 投資"| RD`;

/* ── Table cell class constants ── */
const TH =
  "border-b border-[var(--border)] px-4 py-2 text-left text-xs font-normal uppercase tracking-wide text-[var(--text-muted)]";
const TH_R = TH + " text-right";
const TD = "border-b border-[var(--border)] px-4 py-2 text-sm";
const TD_R = TD + " text-right tabular-nums";

/* ================================================================
   Sub-components
   ================================================================ */

function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current) return;
    rendered.current = true;

    import("mermaid").then(async (mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#FDE7E7",
          primaryBorderColor: "#C02734",
          primaryTextColor: "#2C1517",
          lineColor: "#C02734",
          secondaryColor: "#F3EDED",
          tertiaryColor: "#FDFAFA",
          fontFamily:
            '"Helvetica Neue", Arial, "PingFang TC", sans-serif',
          fontSize: "13px",
        },
        flowchart: { curve: "basis", padding: 15 },
      });

      const id = `mermaid-${Date.now()}`;
      const { svg } = await mod.default.render(id, chart);
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, [chart]);

  return <div ref={ref} className="my-4 text-center" />;
}

function LightboxModal({
  html,
  onClose,
}: {
  html: string | null;
  onClose: () => void;
}) {
  if (!html) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-[rgba(44,21,23,0.55)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-[85vw] max-w-[1200px] cursor-default overflow-auto rounded-xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function Sources({ list }: { list: { label: string; href: string }[] }) {
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

function ContentBox({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
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
      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${valueClass ?? ""}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-[#6B5E60]">{sub}</div>}
    </div>
  );
}

function SideToc({ activeId }: { activeId: string }) {
  return (
    <nav
      className="fixed top-1/2 z-50 hidden w-[180px] -translate-y-1/2 text-xs leading-relaxed min-[1440px]:block"
      style={{ right: "calc((100vw - 960px) / 2 - 200px)" }}
    >
      <ul className="border-l-2 border-[var(--border)]">
        {SECTIONS.map((s) => {
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

function Placeholder({ text }: { text: string }) {
  return (
    <p className="p-4 text-center text-sm italic text-[var(--text-faint)]">
      {text}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 border-l-[3px] border-[var(--primary)] pl-3 text-lg font-semibold uppercase tracking-wider text-[var(--primary)]">
      {children}
    </div>
  );
}

/* ================================================================
   Main Report
   ================================================================ */
export default function Report({
  ticker,
  name,
  updated,
}: {
  ticker: string;
  name: string;
  updated: string;
}) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [lightboxHtml, setLightboxHtml] = useState<string | null>(null);

  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];

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

  const openLightbox = useCallback((el: HTMLElement) => {
    const svg = el.querySelector("svg");
    if (!svg) return;
    if (!svg.getAttribute("viewBox")) {
      const w =
        svg.getAttribute("width") || svg.getBoundingClientRect().width;
      const h =
        svg.getAttribute("height") || svg.getBoundingClientRect().height;
      svg.setAttribute(
        "viewBox",
        `0 0 ${parseFloat(String(w))} ${parseFloat(String(h))}`,
      );
    }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.removeAttribute("style");
    clone.style.width = "100%";
    clone.style.height = "auto";
    clone.style.maxHeight = "80vh";
    setLightboxHtml(clone.outerHTML);
  }, []);

  if (ticker !== "SNDK") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Report not found for {ticker}</p>
        <Link
          href="/equity-research"
          className="mt-4 text-[var(--primary)] hover:underline"
        >
          ← Equity Research
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] px-6 py-8 pb-16">
      <Link
        href="/equity-research"
        className="mb-3 inline-block text-sm font-semibold text-[var(--primary)] opacity-70 transition-opacity hover:opacity-100"
      >
        ← Equity Research
      </Link>

      {/* ── Header ── */}
      <header className="mb-10 border-b border-[var(--border)] pb-5">
        <h1 className="text-3xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">{ticker}</span> 個股研究
        </h1>
        <div className="mt-1 text-sm text-[var(--text-muted)]">
          {name} · 最後更新：{updated}
        </div>
      </header>

      {/* ── Table of Contents ── */}
      <nav className="mb-10 rounded-lg border border-[var(--border)] bg-white px-6 py-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          目錄
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            <a
              href="#ch-fundamental"
              className="hover:text-[var(--primary)] hover:underline"
            >
              基本面
            </a>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-[#6B5E60]">
              <li>
                <a
                  href="#sec-overview"
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  企業概述
                </a>
              </li>
              <li>
                <a
                  href="#sec-business-model"
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  商業模式
                </a>
              </li>
              <li>
                <a
                  href="#sec-products"
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  產品與應用場景
                </a>
              </li>
              <li>
                <a
                  href="#sec-market"
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  市場規模與成長趨勢
                </a>
              </li>
              <li>
                <a
                  href="#sec-competition"
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  競爭格局
                </a>
              </li>
              <li>
                <a
                  href="#sec-moat"
                  className="hover:text-[var(--primary)] hover:underline"
                >
                  競爭優勢 / Moat
                </a>
              </li>
            </ol>
          </li>
          <li>
            <a
              href="#ch-financial"
              className="hover:text-[var(--primary)] hover:underline"
            >
              財務面
            </a>
          </li>
          <li>
            <a
              href="#ch-flow"
              className="hover:text-[var(--primary)] hover:underline"
            >
              籌碼面
            </a>
          </li>
          <li>
            <a
              href="#ch-technical"
              className="hover:text-[var(--primary)] hover:underline"
            >
              技術面
            </a>
          </li>
          <li>
            <a
              href="#ch-valuation"
              className="hover:text-[var(--primary)] hover:underline"
            >
              估值模型
            </a>
          </li>
        </ol>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          CHAPTER I: 基本面
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-16" id="ch-fundamental">
        <div className="mb-8 border-b-2 border-[var(--primary)] pb-2 text-xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">I.</span> 基本面
        </div>

        {/* ── 01 · 企業概述 ── */}
        <section id="sec-overview" className="mb-10">
          <SectionTitle>01 · 企業概述</SectionTitle>

          <div className="mb-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            <KvCard label="Ticker" value="SNDK" sub="Nasdaq" />
            <KvCard
              label="總部"
              value="Milpitas, CA"
              sub="951 Sandisk Drive"
              valueClass="text-lg"
            />
            <KvCard label="員工數" value="~11,000" />
            <KvCard
              label="上市日期"
              value="2025/02/24"
              sub="WDC 分拆重新上市"
              valueClass="text-lg"
            />
            <KvCard
              label="財年"
              value="7 月 ~ 6 月"
              sub="FY2025 截至 2025/06/27"
              valueClass="text-lg"
            />
          </div>

          <ContentBox title="公司背景">
            <p className="mb-3 text-sm">
              Sandisk Corporation
              是全球領先的 NAND Flash
              儲存解決方案供應商，開發、製造並銷售 SSD、嵌入式儲存、記憶卡及
              USB
              隨身碟等產品，應用於資料中心、PC、行動裝置、遊戲主機、車用及
              IoT 終端市場。
            </p>
            <p className="mb-3 text-sm">
              SanDisk 品牌最早由 Eli Harari、Sanjay Mehrotra 與 Jack Yuan 於
              1988 年創立，是 Flash 儲存產業的先驅。2016 年被 Western
              Digital（WDC）以約 190
              億美元收購，整併為 WDC 旗下的 Flash 事業群。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Sandisk IR — Celebrates Nasdaq Listing After Completing Separation (2025/02/24)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-celebrates-nasdaq-listing-after-completing-separation",
                },
                {
                  label: "SEC EDGAR — SNDK 10-K Filing",
                  href: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002023554&type=10-K",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="WDC 分拆歷程">
            <table className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>時間</th>
                  <th className={TH}>事件</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>2016 年 5 月</td>
                  <td className={TD}>
                    Western Digital 以 ~$19B 收購 SanDisk，SanDisk 從 Nasdaq
                    下市
                  </td>
                </tr>
                <tr>
                  <td className={TD}>2023 年 10 月</td>
                  <td className={TD}>
                    WDC 宣布將 HDD 與 Flash
                    事業分拆為兩家獨立上市公司
                  </td>
                </tr>
                <tr>
                  <td className={TD}>2025 年 2 月 24 日</td>
                  <td className={TD}>
                    分拆完成，Sandisk 以 SNDK 重新於 Nasdaq 掛牌交易
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mb-3 text-sm">
              分拆後，原 WDC 旗下所有 Flash 儲存產品（含 Western
              Digital、WD_BLACK、SanDisk、SanDisk Professional 品牌的 SSD /
              記憶卡 / 隨身碟）歸入 Sandisk；HDD 產品則留在 Western Digital。
            </p>
            <Sources
              list={[
                {
                  label:
                    "WDC — Completes Planned Company Separation (2025/02/24)",
                  href: "https://www.westerndigital.com/company/newsroom/press-releases/2025/2025-02-24-western-digital-completes-planned-company-separation",
                },
                {
                  label: "Sandisk — Corporate Separation and Brand FAQ",
                  href: "https://www.sandisk.com/sandisk-separation-faqs",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="製造：與 Kioxia 的合資關係">
            <p className="mb-3 text-sm">
              Sandisk 與 Kioxia（前身為 Toshiba Memory）維持超過 20 年的 NAND
              Flash 製造合資關係，共同運營位於日本的晶圓廠：
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong>四日市工廠（Yokkaichi）</strong> —
                位於三重縣，為歷史最悠久的合資廠區。2026 年 1
                月雙方將合資協議延長至 2034 年底。
              </li>
              <li>
                <strong>北上工廠（Kitakami）</strong> —
                位於岩手縣。Fab2（K2）於 2025 年 9 月啟用，具備生產第八代
                218 層 3D NAND（CBA 技術）能力，產能將於 2026
                年上半年開始放量。
              </li>
            </ul>
            <p className="mb-3 text-sm">
              合資產能約 80% 由 Kioxia 與 Sandisk 平分，其餘 20% 為 Kioxia
              獨有。此合資模式讓 Sandisk 無需獨資建廠即可取得先進 NAND
              產能，顯著降低資本支出負擔。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Sandisk IR — Kioxia and Sandisk Extend Yokkaichi JV Through 2034 (2026/01/29)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/kioxia-and-sandisk-extend-yokkaichi-joint-venture-agreement",
                },
                {
                  label:
                    "Sandisk — Kioxia and Sandisk Announce Fab2 at Kitakami (2025/09/29)",
                  href: "https://www.sandisk.com/company/newsroom/press-releases/2025/2025-09-29-kioxia-and-sandisk-announce-beginning-of-operation-of-fab2-at-kitakami-plant-japan-to-meet-the-market-demand-driven-by-ai",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="管理層">
            <table className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>職位</th>
                  <th className={TH}>姓名</th>
                  <th className={TH}>背景</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>CEO &amp; Chairman</td>
                  <td className={TD}>David V. Goeckeler</td>
                  <td className={TD}>原 WDC CEO，主導分拆</td>
                </tr>
                <tr>
                  <td className={TD}>CFO</td>
                  <td className={TD}>Luis Felipe Visoso</td>
                  <td className={TD}>
                    前 Unity Software CFO；曾任 Palo Alto Networks、AWS CFO
                  </td>
                </tr>
                <tr>
                  <td className={TD}>CTO</td>
                  <td className={TD}>Alper Ilkbahar</td>
                  <td className={TD}>
                    負責 NAND 技術開發與次世代技術；前 WDC SVP / Intel Optane GM
                  </td>
                </tr>
                <tr>
                  <td className={TD}>COO</td>
                  <td className={TD}>Don Angspatt</td>
                  <td className={TD}>
                    負責全球營運、晶圓廠、封測、供應鏈、採購、IT
                  </td>
                </tr>
                <tr>
                  <td className={TD}>CRO</td>
                  <td className={TD}>Jim Elliott</td>
                  <td className={TD}>負責營收成長與市場拓展</td>
                </tr>
              </tbody>
            </table>
            <p className="text-sm">
              董事會由 8 名董事組成，其中 7 名為外部獨立董事。
            </p>
          </ContentBox>
        </section>

        {/* ── 02 · 商業模式 ── */}
        <section id="sec-business-model" className="mb-10">
          <SectionTitle>02 · 商業模式</SectionTitle>

          <ContentBox title="獲利模式">
            <div
              className="relative cursor-zoom-in"
              onClick={(e) => openLightbox(e.currentTarget)}
            >
              <Mermaid chart={MERMAID_BUSINESS_MODEL} />
              <span className="absolute bottom-1 right-2 text-[0.68rem] text-[var(--text-faint)] pointer-events-none">
                click to expand
              </span>
            </div>
            <Sources
              list={[
                {
                  label: "SEC — SNDK 10-K Annual Report (FY2025)",
                  href: "https://last10k.com/sec-filings/sndk/0002023554-25-000034.htm",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="營收結構：三大終端市場">
            <div className="overflow-x-auto">
              <table className="mb-3 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>終端市場</th>
                    <th className={TH}>說明</th>
                    <th className={TH_R}>FY2025 營收</th>
                    <th className={TH_R}>佔比</th>
                    <th className={TH_R}>Q2 FY2026</th>
                    <th className={TH_R}>佔比</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={TD}>
                      <strong>Edge</strong>（原 Client）
                    </td>
                    <td className={TD}>
                      PC / 筆電 / 遊戲主機 / 車用 / 行動裝置 SSD 與嵌入式儲存
                    </td>
                    <td className={TD_R}>$4,127M</td>
                    <td className={TD_R}>56.1%</td>
                    <td className={TD_R}>$1,700M</td>
                    <td className={TD_R}>56.1%</td>
                  </tr>
                  <tr>
                    <td className={TD}>
                      <strong>Consumer</strong>
                    </td>
                    <td className={TD}>
                      記憶卡、USB 隨身碟、可攜式 SSD 等零售產品
                    </td>
                    <td className={TD_R}>$2,268M</td>
                    <td className={TD_R}>30.8%</td>
                    <td className={TD_R}>$907M</td>
                    <td className={TD_R}>29.9%</td>
                  </tr>
                  <tr>
                    <td className={TD}>
                      <strong>Datacenter</strong>（原 Cloud）
                    </td>
                    <td className={TD}>
                      企業級 SSD、AI 推論儲存、超大規模資料中心
                    </td>
                    <td className={TD_R}>$960M</td>
                    <td className={TD_R}>13.1%</td>
                    <td className={TD_R}>$440M</td>
                    <td className={TD_R}>14.5%</td>
                  </tr>
                  <tr className="border-t-2 border-[var(--border)] font-semibold">
                    <td className={TD}>合計</td>
                    <td className={TD} />
                    <td className={TD_R}>$7,355M</td>
                    <td className={TD_R}>100%</td>
                    <td className={TD_R}>$3,030M</td>
                    <td className={TD_R}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-3 text-sm">
              <strong>趨勢觀察：</strong>Datacenter
              是成長最快的板塊（FY2025 YoY +195%，Q2 FY2026 YoY +76%），受惠於
              AI 推論與超大規模客戶需求。Edge
              仍為營收主力，佔比穩定在 ~56%。Consumer 受惠品牌力與 Nintendo
              Switch 2 合作，營收穩健。
            </p>
            <div className="text-xs text-[var(--text-faint)]">
              FY2025 = 截至 2025/06/27 財年；Q2 FY2026 = 截至 2026/01/02 季度
            </div>
            <Sources
              list={[
                {
                  label:
                    "Sandisk IR — Q4 & Full Year FY2025 Financial Results (2025/08/14)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-reports-fiscal-fourth-quarter-2025-financial-results",
                },
                {
                  label:
                    "Sandisk IR — Q2 FY2026 Financial Results (2026/01/29)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-reports-fiscal-second-quarter-2026-financial-results",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="客戶與通路">
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong>OEM 客戶：</strong>PC
                廠商、手機廠商、遊戲主機廠（Nintendo）、車用 Tier
                1、雲端超大規模業者（Hyperscalers）。Q1 FY2026 揭露有 2 家
                Hyperscaler 正在認證中，第 3 家及大型 OEM 預計 CY2026 加入。
              </li>
              <li>
                <strong>通路 / 零售：</strong>Consumer
                產品透過零售通路（Amazon、Best Buy
                等）與經銷商銷售，SanDisk 品牌知名度為主要競爭優勢。
              </li>
              <li>
                <strong>客戶集中度：</strong>前 10 大客戶佔營收約 40%（Q1
                FY2026），分散度尚可。
              </li>
            </ul>
            <Sources
              list={[
                {
                  label:
                    "SEC — SNDK 10-Q (Q1 FY2026, filed 2025/11/07)",
                  href: "https://investor.sandisk.com/static-files/62694580-addb-49ee-b362-762ba5029a34",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="品牌組合">
            <p className="mb-3 text-sm">
              分拆後 Sandisk 保留以下 Flash 相關品牌：
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong>SanDisk / SanDisk Professional</strong> —
                消費者與專業用戶記憶卡、隨身碟、可攜式 SSD
              </li>
              <li>
                <strong>Western Digital / WD</strong> — 內接式 SSD（PC / NAS）
              </li>
              <li>
                <strong>WD_BLACK</strong> — 電競取向高效能 SSD
              </li>
            </ul>
            <Sources
              list={[
                {
                  label: "Sandisk — Corporate Separation and Brand FAQ",
                  href: "https://www.sandisk.com/sandisk-separation-faqs",
                },
              ]}
            />
          </ContentBox>
        </section>

        {/* ── 03 · 產品與應用場景 ── */}
        <section id="sec-products" className="mb-10">
          <SectionTitle>03 · 產品與應用場景</SectionTitle>

          <ContentBox title="NAND 技術世代">
            <p className="mb-3 text-sm">
              Sandisk 與 Kioxia 共同開發的 3D NAND 技術品牌為{" "}
              <strong>BiCS</strong>（Bit Cost
              Scalable）。目前量產的最先進節點為 BiCS8（218 層），採用
              CBA（CMOS directly Bonded to
              Array）架構，將邏輯層與記憶體陣列分別製造後鍵合，突破傳統堆疊層數限制。
            </p>
            <table className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>世代</th>
                  <th className={TH}>層數</th>
                  <th className={TH}>關鍵特性</th>
                  <th className={TH}>狀態</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>BiCS6</td>
                  <td className={TD}>162 層</td>
                  <td className={TD}>成熟節點，廣泛用於消費級產品</td>
                  <td className={TD}>量產中</td>
                </tr>
                <tr>
                  <td className={TD}>BiCS8</td>
                  <td className={TD}>218 層</td>
                  <td className={TD}>
                    CBA 架構；2Tb QLC die（業界最高密度）
                  </td>
                  <td className={TD}>量產中，Q1 FY2026 佔出貨 bit 15%</td>
                </tr>
              </tbody>
            </table>
            <p className="mb-3 text-sm">
              BiCS8 預計於 FY2026 年底前成為主要產能節點（majority
              production）。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Sandisk IR — Q1 FY2026 Earnings Release (BiCS8 ramp)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-reports-fiscal-first-quarter-2026-financial-results",
                },
                {
                  label:
                    "Sandisk — Kitakami Fab2 (BiCS8 / CBA) Announcement (2025/09/29)",
                  href: "https://www.sandisk.com/company/newsroom/press-releases/2025/2025-09-29-kioxia-and-sandisk-announce-beginning-of-operation-of-fab2-at-kitakami-plant-japan-to-meet-the-market-demand-driven-by-ai",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="Datacenter 產品線">
            <div className="overflow-x-auto">
              <table className="mb-3 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>產品</th>
                    <th className={TH}>容量</th>
                    <th className={TH}>技術</th>
                    <th className={TH}>應用場景</th>
                    <th className={TH}>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={TD}>
                      <strong>SN670 NVMe SSD</strong>
                    </td>
                    <td className={TD}>30.72TB ~ 122.88TB</td>
                    <td className={TD}>BiCS8 QLC / Stargate ASIC</td>
                    <td className={TD}>AI 推論、資料擷取、內容生成</td>
                    <td className={TD}>出貨中</td>
                  </tr>
                  <tr>
                    <td className={TD}>
                      <strong>UltraQLC 256TB SSD</strong>
                    </td>
                    <td className={TD}>256TB</td>
                    <td className={TD}>BiCS8 QLC CBA / UltraQLC 平台</td>
                    <td className={TD}>超大規模資料中心、高密度儲存</td>
                    <td className={TD}>U.2 於 H1 2026 出貨</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-3 text-sm">
              <strong>Stargate 控制器：</strong>自研 clean-sheet ASIC，搭配
              BiCS8 QLC，實現直接寫入 QLC（不依賴 pSLC
              buffer），為業界首創的 UltraQLC
              架構，大幅提升寫入效率與耐久度。
            </p>
            <Sources
              list={[
                {
                  label: "Sandisk — SN670 NVMe SSD Product Page",
                  href: "https://www.sandisk.com/products/ssd/internal-ssd/sandisk-sn670-nvme-ssd",
                },
                {
                  label:
                    "Sandisk IR — UltraQLC Technology Platform at FMS 2025 (2025/08/05)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-showcases-ultraqlctm-technology-platform-milestone",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="次世代技術：High Bandwidth Flash (HBF)">
            <p className="mb-3 text-sm">
              HBF 是 Sandisk 定義的全新記憶體層級，定位介於
              HBM（高速、低容量）與 SSD（高容量、低速）之間，專為 AI
              推論設計。效能可達無限容量 HBM 的 97.8%，同時提供遠超 HBM
              的容量擴展性與電力效率。
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                2025 年 8 月：與 SK hynix 簽署 MOU，共同推動 HBF 標準化
              </li>
              <li>
                2026 年 2 月：在 OCP（Open Compute Project）下建立 HBF
                專屬工作組
              </li>
              <li>
                <strong>時程：</strong>H2 CY2026 提供首批樣品；CY2027
                初首批搭載 HBF 的 AI 推論裝置問世
              </li>
            </ul>
            <Sources
              list={[
                {
                  label:
                    "Sandisk IR — Collaborate with SK hynix on HBF Standardization (2025/08/06)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-collaborate-sk-hynix-drive-standardization-high",
                },
                {
                  label:
                    "Sandisk — HBF Standardization under OCP (2026/02/25)",
                  href: "https://www.sandisk.com/company/newsroom/press-releases/2026/2026-02-25-sandisk-and-sk-hynix-begin-global-standardization-of-next-generation-memory-solution-high-bandwidth-flash-hbf",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="Edge（Client）產品線：Optimus 品牌">
            <p className="mb-3 text-sm">
              CES 2026 上 Sandisk 宣布將原 WD Blue / WD_BLACK
              品牌整合為全新的 <strong>SANDISK Optimus</strong> 系列，預計 H1
              2026 上市：
            </p>
            <table className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>產品線</th>
                  <th className={TH}>定位</th>
                  <th className={TH}>取代原品牌</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>
                    <strong>Optimus</strong>
                  </td>
                  <td className={TD}>主流效能，內容創作者</td>
                  <td className={TD}>WD Blue（含 SN5100）</td>
                </tr>
                <tr>
                  <td className={TD}>
                    <strong>Optimus GX</strong>
                  </td>
                  <td className={TD}>電競玩家，快速載入 / 大容量</td>
                  <td className={TD}>WD_BLACK（含 SN7100）</td>
                </tr>
                <tr>
                  <td className={TD}>
                    <strong>Optimus GX PRO</strong>
                  </td>
                  <td className={TD}>旗艦，AI PC / 工作站 / 高階電競</td>
                  <td className={TD}>新產品線</td>
                </tr>
              </tbody>
            </table>
            <Sources
              list={[
                {
                  label:
                    "Sandisk — Unveils SANDISK Optimus SSD Product Brand (2026/01/05)",
                  href: "https://www.sandisk.com/company/newsroom/press-releases/2026/2026-01-05-sandisk-unveils-sandisk-optimus-ssd-product-brand",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="嵌入式儲存：iNAND（車用 / 行動裝置）">
            <p className="mb-3 text-sm">
              Sandisk 的 <strong>iNAND</strong> 系列為 eMMC / UFS
              嵌入式儲存，應用於車用 ADAS、資訊娛樂系統及行動裝置。
            </p>
            <div className="overflow-x-auto">
              <table className="mb-3 w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>產品</th>
                    <th className={TH}>介面</th>
                    <th className={TH}>容量</th>
                    <th className={TH}>特色</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={TD}>
                      <strong>iNAND AT EU752</strong>
                    </td>
                    <td className={TD}>UFS 4.1（業界首款車規）</td>
                    <td className={TD}>128GB ~ 1TB</td>
                    <td className={TD}>
                      BiCS8 TLC；-40°C ~ +105°C；Fast
                      Boot（2 秒內啟動倒車影像）；健康狀態監控
                    </td>
                  </tr>
                  <tr>
                    <td className={TD}>iNAND AT EU552</td>
                    <td className={TD}>UFS 3.1</td>
                    <td className={TD}>16GB ~ 256GB</td>
                    <td className={TD}>成熟車規產品</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-3 text-sm">
              iNAND AT EU752 的循序讀寫分別達 4,200 / 3,900 MB/s，為前代 UFS
              3.1 的 2 倍以上，已開始向客戶出貨。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Sandisk — Industry's First Automotive Grade UFS4.1 at Embedded World 2025 (2025/03/11)",
                  href: "https://www.sandisk.com/company/newsroom/press-releases/2025/2025-03-11-sandisk-introduces-the-industrys-first-automotive-grade-ufs4-1-at-Embedded-World-2025",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="Consumer 產品線">
            <p className="mb-3 text-sm">
              以 SanDisk
              品牌銷售的零售消費產品，主打品牌知名度與通路覆蓋：
            </p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong>記憶卡：</strong>SD / microSD（Extreme、Extreme PRO）—
                相機、無人機、Nintendo Switch 2 聯名款（Q1 FY2026 銷售超過
                90 萬張 microSD Express）
              </li>
              <li>
                <strong>USB 隨身碟：</strong>Ultra、Extreme 系列
              </li>
              <li>
                <strong>可攜式 SSD：</strong>Extreme / Extreme PRO Portable SSD
              </li>
            </ul>
            <Sources
              list={[
                {
                  label:
                    "Sandisk IR — Q1 FY2026 Earnings (Nintendo Switch 2 microSD)",
                  href: "https://investor.sandisk.com/news-releases/news-release-details/sandisk-reports-fiscal-first-quarter-2026-financial-results",
                },
              ]}
            />
          </ContentBox>
        </section>

        {/* ── 04 · 市場規模與成長趨勢 ── */}
        <section id="sec-market" className="mb-10">
          <SectionTitle>04 · 市場規模與成長趨勢</SectionTitle>

          <ContentBox title="NAND Flash 整體市場規模">
            <table className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>年度</th>
                  <th className={TH_R}>市場規模（估計）</th>
                  <th className={TH}>備註</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>CY2025</td>
                  <td className={TD_R}>~$56 ~ $70B</td>
                  <td className={TD}>各研究機構估計範圍</td>
                </tr>
                <tr>
                  <td className={TD}>CY2026</td>
                  <td className={TD_R}>~$65B+</td>
                  <td className={TD}>AI 驅動 Datacenter 需求加速</td>
                </tr>
                <tr>
                  <td className={TD}>CY2031</td>
                  <td className={TD_R}>~$76B</td>
                  <td className={TD}>CAGR ~5.3%（Mordor Intelligence）</td>
                </tr>
              </tbody>
            </table>
            <p className="mb-3 text-sm">
              注意：各研究機構對 NAND
              市場規模的定義與計算口徑不同（含/不含
              module、含/不含嵌入式），導致估計差異大。上表取多家來源的交叉參考。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Mordor Intelligence — NAND Flash Market Share & Size",
                  href: "https://www.mordorintelligence.com/industry-reports/nand-flash-memory-market",
                },
                {
                  label:
                    "Expert Market Research — NAND Flash Memory Market 2026-2035",
                  href: "https://www.expertmarketresearch.com/reports/nand-flash-memory-market",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="供需動態（CY2026）">
            <div className="mb-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
              <KvCard
                label="需求端 Bit 成長"
                value="+20~22% YoY"
                valueClass="text-xl"
              />
              <KvCard
                label="供給端 Bit 成長"
                value="+15~17% YoY"
                valueClass="text-xl"
              />
              <KvCard
                label="供需缺口"
                value="供不應求"
                valueClass="text-xl text-[var(--primary)]"
              />
            </div>
            <p className="mb-3 text-sm">
              供給成長受限於廠商刻意控產（NAND 大廠 H2 CY2025
              減產）與新產能爬坡需要時間，需求端則受 AI 資料中心帶動。TrendForce
              預估 Q1 CY2026 NAND 合約價 QoQ 雙位數上漲。
            </p>
            <Sources
              list={[
                {
                  label:
                    "TrendForce — Memory Makers Prioritize Server, Driving Price Increases in 1Q26 (2026/01/05)",
                  href: "https://www.trendforce.com/presscenter/news/20260105-12860.html",
                },
                {
                  label:
                    "TrendForce — NAND Giants Cut Output in 2H25 (2025/11/13)",
                  href: "https://www.trendforce.com/news/2025/11/13/news-nand-giants-reportedly-cut-output-in-2h25-as-prices-surge-samsung-mulls-20-30-hike-in-2026/",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="結構性轉變：Datacenter 成為 NAND 最大終端市場">
            <p className="mb-3 text-sm">
              Sandisk 管理層在 Q2 FY2026 earnings call 明確指出：
              <strong>
                CY2026 將是 Datacenter 首次超越 Client 成為 NAND
                最大終端市場
              </strong>
              ，結束過去 10~15 年由裝置端主導的市場結構。
            </p>
            <table className="mb-3 w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>指標</th>
                  <th className={TH_R}>前期預估</th>
                  <th className={TH_R}>最新預估</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={TD}>CY2026 Datacenter EB 成長</td>
                  <td className={TD_R}>mid-20s %</td>
                  <td
                    className={TD_R}
                    style={{ color: "var(--primary)", fontWeight: 600 }}
                  >
                    mid-to-high 60s %
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mb-3 text-sm">
              管理層連續上修 Datacenter 需求預估（mid-20s → mid-40s →
              mid-to-high 60s），反映 AI 基礎設施投資加速與 HDD 替代效應。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Motley Fool — SNDK Q2 FY2026 Earnings Call Transcript (2026/01/29)",
                  href: "https://www.fool.com/earnings/call-transcripts/2026/01/29/sandisk-sndk-q2-2026-earnings-call-transcript/",
                },
                {
                  label:
                    "DefenseWorld — Sandisk Says Data Centers Will Dominate NAND by 2026",
                  href: "https://www.defenseworld.net/2026/03/03/sandisk-says-data-centers-will-dominate-nand-by-2026-as-ltas-reshape-supply-and-pricing.html",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="需求驅動因素">
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <strong>AI 推論 / KV Cache 儲存：</strong>NVIDIA 的
                Key-Value Cache
                架構需要大量低延遲儲存。管理層初步估計 CY2027 僅 AI
                相關需求就有 75~100 EB 增量，且尚未納入現有預測。
              </li>
              <li>
                <strong>HDD 替代：</strong>Nearline HDD
                供給嚴重落後需求，CSP 被迫採用大容量 QLC Enterprise SSD
                替代，加速 NAND 在資料中心的滲透率。
              </li>
              <li>
                <strong>AI PC / Edge AI：</strong>本地端 AI
                推論帶動單機 SSD 容量需求提升（512GB → 1TB+ 成為標配）。
              </li>
              <li>
                <strong>車用儲存：</strong>ADAS L2+ / L3
                需要高容量、高可靠度嵌入式儲存（UFS
                4.1），單車儲存需求持續提升。
              </li>
            </ul>
            <p className="mb-3 text-sm">
              到 CY2026，每 5 個 NAND bit 中就有 1 個用於 AI
              應用，貢獻高達 34% 的市場價值。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Motley Fool — SNDK Q2 FY2026 Earnings Call Transcript (2026/01/29)",
                  href: "https://www.fool.com/earnings/call-transcripts/2026/01/29/sandisk-sndk-q2-2026-earnings-call-transcript/",
                },
                {
                  label:
                    "IndexBox — NAND Flash Market Forecast to 2035",
                  href: "https://www.indexbox.io/blog/nand-flash-market-forecast-points-higher-toward-2035-driven-by-ai-and-data-center-expansion/",
                },
              ]}
            />
          </ContentBox>

          <ContentBox title="長期 Bit 成長展望">
            <p className="mb-3 text-sm">
              Sandisk 管理層預期 CY2027~2028 的年化 bit 成長維持在{" "}
              <strong>mid-to-high teens %</strong>
              ，以此作為產能規劃基準（plan of record）。搭配 AI
              基礎設施投資預計於 2030 年累計突破 $1T，NAND
              儲存將持續受惠於資料量爆發式成長。
            </p>
            <Sources
              list={[
                {
                  label:
                    "Motley Fool — SNDK Q2 FY2026 Earnings Call Transcript (2026/01/29)",
                  href: "https://www.fool.com/earnings/call-transcripts/2026/01/29/sandisk-sndk-q2-2026-earnings-call-transcript/",
                },
              ]}
            />
          </ContentBox>
        </section>

        {/* ── 05 · 競爭格局 ── */}
        <section id="sec-competition" className="mb-10">
          <SectionTitle>05 · 競爭格局</SectionTitle>
          <ContentBox>
            <Placeholder text="待填入：Market Share、主要競爭者比較（Samsung、SK Hynix、Micron、Kioxia）" />
          </ContentBox>
        </section>

        {/* ── 06 · 競爭優勢 / Moat ── */}
        <section id="sec-moat" className="mb-10">
          <SectionTitle>06 · 競爭優勢 / Moat</SectionTitle>
          <ContentBox>
            <Placeholder text="待填入：技術壁壘、成本優勢、品牌、專利、轉換成本" />
          </ContentBox>
        </section>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CHAPTER II: 財務面
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-16" id="ch-financial">
        <div className="mb-8 border-b-2 border-[var(--primary)] pb-2 text-xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">II.</span> 財務面
        </div>
        <ContentBox>
          <Placeholder text="待填入：三表分析、毛利率趨勢、營運槓桿、現金流、資本結構" />
        </ContentBox>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CHAPTER III: 籌碼面
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-16" id="ch-flow">
        <div className="mb-8 border-b-2 border-[var(--primary)] pb-2 text-xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">III.</span> 籌碼面
        </div>
        <ContentBox>
          <Placeholder text="待填入：機構持股、Short Interest、內部人交易、ETF 持倉" />
        </ContentBox>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CHAPTER IV: 技術面
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-16" id="ch-technical">
        <div className="mb-8 border-b-2 border-[var(--primary)] pb-2 text-xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">IV.</span> 技術面
        </div>
        <ContentBox>
          <Placeholder text="待填入：趨勢、均線、量能、關鍵支撐壓力" />
        </ContentBox>
      </div>

      {/* ════════════════════════════════════════════════════════════
          CHAPTER V: 估值模型
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-16" id="ch-valuation">
        <div className="mb-8 border-b-2 border-[var(--primary)] pb-2 text-xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">V.</span> 估值模型
        </div>
        <ContentBox>
          <Placeholder text="待填入：DCF、Comps、歷史本益比、目標價" />
        </ContentBox>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--text-faint)]">
        Equity Research · {ticker} · {updated}
      </footer>

      {/* ── Side TOC ── */}
      <SideToc activeId={activeId} />

      {/* ── Lightbox ── */}
      <LightboxModal
        html={lightboxHtml}
        onClose={() => setLightboxHtml(null)}
      />
    </div>
  );
}

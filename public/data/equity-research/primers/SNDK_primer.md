# SNDK Company Primer

## 1. 公司概覽

Sandisk 是全球領先的 NAND Flash 儲存產品設計與銷售公司，2024 年從 Western Digital 分拆獨立。公司透過與 Kioxia 的合資企業 Flash Ventures（日本四座晶圓廠）取得 NAND wafer，自行設計控制器與韌體，產品覆蓋消費者（USB/SD 卡）、嵌入式（車用/IoT/手機）到企業級數據中心（eSSD）全線。FY26 Q2 營收 $3,025M，YoY +61%，三大業務線全面高速成長，其中數據中心 SSD 受 AI 需求驅動成長最快。

## 2. 業務線拆解

| Segment | 營收（$M） | 佔比 | YoY | QoQ | 關鍵產品 |
|---------|-----------|------|-----|-----|---------|
| **Edge**（嵌入式/車用/IoT） | 1,678 | 55.5% | +63% | +29% | 嵌入式 NAND（手機/車用/IoT） |
| **Consumer**（零售） | 907 | 30.0% | +52% | +14% | Extreme Fit、Extreme PRO（USB/SD） |
| **Datacenter**（企業 SSD） | 440 | 14.5% | +76% | +110% | Stargate 128TB eSSD、SN861 |

- 總營收 $3,025M（FY26 Q2），YoY +61%，QoQ +31%
- Datacenter 佔比最小但成長最猛（QoQ +110%），AI 數據中心需求驅動
- 管理層預期 FY26 Q3 營收約 $2,750M（QoQ -9%），消費電子淡季

## 3. 核心技術

### BiCS8（第 8 代 3D NAND）
- **原理**：3D NAND 是將記憶體單元垂直堆疊的技術。BiCS8 採用 **218 層堆疊** + **CBA（CMOS directly Bonded to Array）** 架構——將邏輯電路（CMOS）和記憶體陣列分別在獨立晶圓上製造，各自優化後再鍵合在一起，解決了傳統方案中邏輯與記憶體互相妥協的問題。同時引入 **lateral shrink**（橫向微縮）技術，在不增加層數的情況下提升每層密度。
- **產業定位**：業界領先。BiCS8 QLC 單 die 容量達 **2Tb（256GB）**，為業界最高。與 Samsung 的第 9 代 V-NAND（236 層）和 SK Hynix 的 321 層 QLC 處於同一競爭梯隊。
- **世代演進**：BiCS6（112 層）→ BiCS7（162 層）→ **BiCS8（218 層 + CBA）**。每一代的關鍵提升是層數增加帶來更高密度、CBA 架構帶來更快 I/O 速度與更好的成本結構。

### TLC vs QLC
- **原理**：NAND 記憶體單元透過在浮閘（charge trap）中儲存不同數量的電子，產生不同的閾值電壓來代表資料。**TLC（Triple-Level Cell）** 每個單元存 3 bits（8 種電壓狀態），**QLC（Quad-Level Cell）** 存 4 bits（16 種電壓狀態）。QLC 容量比 TLC 高 33%，但因為電壓間距更窄，寫入速度更慢、耐久性更低（TLC ~1,000-3,000 P/E cycles vs QLC ~100-1,000 cycles）。
- **產業定位**：TLC 是目前主流，適合讀寫平衡的工作負載；QLC 專攻讀取密集的大容量場景（AI 數據湖、冷儲存），正在取代部分 HDD 市場。Sandisk 在企業級同時推 TLC（SN861，高性能）和 QLC（Stargate/UltraQLC，大容量）雙產品線。

### Stargate（128TB QLC eSSD）
- **原理**：Stargate 是 Sandisk 為超大容量企業 SSD 開發的全新控制器架構（clean-sheet ASIC 設計）。核心挑戰在於管理 128TB 級別的數據回收（garbage collection）——不能每幾天就覆寫整顆 128TB，因此需要全新的演算法來最小化背景回收的影響。支援 **32 通道、每通道最多 64 die**，遠超消費級 SSD 的 8 通道。
- **產業定位**：領先。128TB 已出貨（FY26 Q3），256TB 預計 2026 年，512TB 預計 2027 年，路線圖指向 **1PB SSD**。採用 PCIe Gen 5，未來可能升級 PCIe 6.0。主要競爭：Seagate 計劃 2030 年推出 100TB HDD，但 SSD 在性能上有絕對優勢。
- **Sandisk 的產品名稱**：UltraQLC 平台 = DC SN670 系列 = Stargate 控制器 + BiCS8 QLC NAND。

### HBF（High-Bandwidth Flash）
- **原理**：HBF 是一種全新的記憶體層級，概念類似 HBM（High-Bandwidth Memory）但基於 NAND 而非 DRAM。做法是將多個 NAND die 透過 **TSV（矽穿孔）** 垂直堆疊並用微凸塊連接，形成大量平行資料通道（類似 HBM 的寬匯流排設計）。雖然 NAND 延遲（微秒級）比 DRAM（奈秒級）高 1000 倍，但透過大規模平行存取可達到接近 HBM 的 **頻寬**（第一代 1.6 TB/s 讀取），同時提供 **8-16 倍的容量**（512GB/16-die stack vs HBM 的數十 GB）。
- **為什麼重要**：AI 推論面臨「記憶體牆」——模型參數量爆炸（趨向兆級），但 HBM 容量有限且昂貴，無法將整個模型放進 GPU 記憶體。HBF 的洞察是：**推論工作負載需要的是頻寬，不是延遲**。KAIST 教授金正浩（HBM 之父）預測未來 GPU 將同時整合 HBM + HBF：HBM 做「書架」（快速存取），HBF 做「地下圖書館」（大容量持續供料）。
- **時程**：memory 樣品 2026 H2，搭載 HBF 的推論裝置 2027 年初。Sandisk 已與 SK Hynix 簽署 MoU 共同開發。
- **世代演進**：Gen 1（1.6 TB/s, 512GB）→ Gen 2（>2 TB/s, 1TB）→ Gen 3（>3.2 TB/s, 1.5TB），功耗逐代下降（0.8x → 0.64x）。

### KV Cache（Key-Value Cache）
- **原理**：大型語言模型在推論時，每生成一個 token 都需要參考之前所有 token 的注意力計算結果，這些中間結果就是 KV Cache。隨著 context window 從 100K 擴展到 100M tokens，KV Cache 線性增長，佔用的記憶體遠超模型本身。
- **為什麼重要**：NVIDIA Rubin 平台（CES 2026 發布）引入 KV Cache offloading 架構，將 KV Cache 從昂貴的 HBM 卸載到高速 SSD，實現 5x tokens/second 提升和 5x 能效改善。產業專家估算，100B 模型 + 1000 萬日活用戶需要 **250 PB SSD/天** 來持久化 KV Cache。這直接驅動了 eSSD 需求爆發和 HBF 的戰略意義。

### PCIe Gen 5
- **原理**：第五代 PCIe 介面，單通道頻寬 32 GT/s（約 3.94 GB/s），4 通道總頻寬約 15.75 GB/s，是 Gen 4 的 2 倍。
- **產業定位**：目前企業級 SSD 的主流介面。Sandisk 的 Stargate/UltraQLC 和 SN861 均採用 PCIe Gen 5，充分利用頻寬優勢處理 AI 工作負載的高吞吐需求。

## 4. 競爭格局

| 競爭對手 | 總部 | NAND 技術 | 特點 |
|---------|------|----------|------|
| **Samsung** | 韓國 | V-NAND 9th Gen（236 層） | NAND 市場龍頭，垂直整合（自有 fab + 控制器） |
| **Kioxia** | 日本 | BiCS8（與 Sandisk 共享） | Flash Ventures 合資夥伴，同時是競爭者 |
| **Micron (MU)** | 美國 | 232 層 TLC/QLC | NAND + DRAM 雙線，G8/G9 NAND 技術 |
| **SK Hynix** | 韓國 | 321 層 QLC | HBM 龍頭，與 Sandisk 合作開發 HBF |
| **YMTC** | 中國 | 232 層 | 中國本土廠商，受出口管制影響 |

**Sandisk 差異化優勢**：
- BiCS8 + CBA 架構的技術領先性（與 Kioxia 共享）
- 全產品線覆蓋（消費者→嵌入式→數據中心）
- Flash Ventures 規模效應帶來的成本優勢
- HBF 先發者地位（已簽 SK Hynix MoU，2026 H2 出樣品）
- 消費者品牌認知度（Sandisk 品牌）

**NAND 產業結構**：寡佔格局，五大廠商掌控絕大部分產能。供需動態是影響 ASP 和利潤的關鍵變數。

## 5. 成長與風險

### Tailwinds（順風）
- **AI 數據中心需求**：管理層預期 2026 年數據中心將超越手機成為最大 NAND 終端市場。KV Cache offloading（NVIDIA Rubin）創造結構性 SSD 需求
- **供需結構有利**：需求成長 > 供給成長，預計延續至 2026+，支撐 ASP
- **客戶簽訂長期合約（LTA）**：需求能見度高
- **BiCS8 成本改善**：新製程帶來更好的 cost/bit
- **HBF 開闢新市場**：如果成功，將從 HBM 市場搶下 AI 推論的記憶體份額
- **UltraQLC 取代 HDD**：128-256TB SSD 在 AI 數據湖場景中取代傳統硬碟

### Headwinds（逆風）
- **美國關稅/出口政策**：潛在貿易限制影響供應鏈
- **人才留任**：從 Western Digital 分拆後的人才競爭壓力
- **分拆過渡成本**：獨立運營的一次性費用
- **HBF 執行風險**：全新技術，量產時程（2027）仍有不確定性
- **NAND 產業週期性**：供需平衡一旦逆轉，ASP 可能快速下滑

### 資本支出（CapEx）
- FY26 Q1: $387M / FY26 Q2: $255M
- 主要投向 BiCS8 製程轉換
- 產量成長目標：mid-to-high teens（15-19%）bit growth

---
來源：NotebookLM notebook "Sandisk Corp - SNDK" + Perplexity 技術搜尋
生成日期：2026-03-13

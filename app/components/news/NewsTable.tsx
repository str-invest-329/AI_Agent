"use client";

import { useState } from "react";
import type { NewsItem, FeedbackTarget } from "./types";
import NewsFeedbackModal from "./NewsFeedbackModal";

interface NewsTableProps {
  items: NewsItem[];
}

export default function NewsTable({ items }: NewsTableProps) {
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);
  const [dismissedNews, setDismissedNews] = useState<Set<number>>(new Set());

  const sentimentBadge = (s?: string) => {
    const label = s === "bullish" ? "利多" : s === "bearish" ? "利空" : "中立";
    const color = s === "bullish" ? "text-green-700 bg-green-50" : s === "bearish" ? "text-red-700 bg-red-50" : "text-[#7A5860] bg-[#F8F4F4]";
    return <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>;
  };

  return (
    <>
      <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
        <table className="w-full border-collapse text-[0.88rem]">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left w-[90px]">日期</th>
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left w-[70px]">標的</th>
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left">標題</th>
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left">彙整</th>
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-center w-[60px]">情緒</th>
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-center w-[44px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.filter((_, i) => !dismissedNews.has(i)).map((item, i) => (
                <tr key={i} className="hover:bg-[#FDFBFB] transition-colors">
                  <td className="px-3 py-2.5 border-b border-[#E2D8D8] align-top whitespace-nowrap text-[#B09898]">{item.date}</td>
                  <td className="px-3 py-2.5 border-b border-[#E2D8D8] align-top font-mono text-xs font-semibold text-[#5A3E42]">{item.ticker || "—"}</td>
                  <td className="px-3 py-2.5 border-b border-[#E2D8D8] align-top">
                    {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#C02734] hover:underline">{item.headline}</a> : item.headline}
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D8D8] align-top">{item.summary}</td>
                  <td className="px-3 py-2.5 border-b border-[#E2D8D8] align-top text-center">
                    {sentimentBadge(item.sentiment)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-[#E2D8D8] align-top text-center">
                    <button
                      onClick={() => setFeedbackTarget({ index: i, headline: item.headline, url: item.url, ticker: item.ticker, sentiment: item.sentiment })}
                      className="text-[#B09898] hover:text-[#C02734] transition-colors text-lg leading-none"
                      title="標記此新聞不符需求"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center text-[#B09898] py-8">
                  目前無新聞
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {feedbackTarget && (
        <NewsFeedbackModal
          target={feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          onSubmitted={(index) => {
            setDismissedNews((prev) => new Set(prev).add(index));
            setFeedbackTarget(null);
          }}
        />
      )}
    </>
  );
}

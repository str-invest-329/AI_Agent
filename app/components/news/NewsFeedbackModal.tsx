"use client";

import { useState } from "react";
import type { FeedbackTarget } from "./types";

interface NewsFeedbackModalProps {
  target: FeedbackTarget;
  onClose: () => void;
  onSubmitted: (index: number) => void;
}

export default function NewsFeedbackModal({ target, onClose, onSubmitted }: NewsFeedbackModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/news-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "negative",
          ticker: target.ticker || "GENERAL",
          headline: target.headline,
          url: target.url,
          sentiment: target.sentiment,
          reason: reason.trim(),
          created_by: "web",
        }),
      });
      onSubmitted(target.index);
    } catch {
      alert("回饋送出失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#2C1517] mb-1">標記不符需求</h3>
        <p className="text-sm text-[#7A5860] mb-4 leading-snug">{target.headline}</p>
        {target.ticker && (
          <p className="text-xs text-[#B09898] mb-3">標的：{target.ticker}</p>
        )}
        <textarea
          autoFocus
          className="w-full border border-[#E2D8D8] rounded-md p-3 text-sm text-[#2C1517] placeholder-[#B09898] focus:outline-none focus:ring-2 focus:ring-[#C02734]/30 resize-none"
          rows={3}
          placeholder={`為什麼這則新聞不符合 ${target.ticker || "該標的"} 的投資需求？`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-xs text-[#B09898] mt-1.5">例：雖然拿到 900 億，但不影響當前投資敘事的發展</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-[#7A5860] hover:text-[#2C1517] transition-colors"
          >
            取消
          </button>
          <button
            disabled={!reason.trim() || submitting}
            onClick={handleSubmit}
            className="px-4 py-1.5 text-sm text-white bg-[#C02734] rounded-md hover:bg-[#A01F2C] disabled:opacity-40 transition-colors"
          >
            {submitting ? "送出中..." : "送出"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, ticker, headline, url, sentiment, reason, created_by } = body;

  if (!type || !ticker || !headline || !reason) {
    return NextResponse.json(
      { error: "type, ticker, headline, and reason are required" },
      { status: 400 },
    );
  }

  if (!["positive", "negative"].includes(type)) {
    return NextResponse.json(
      { error: "type must be 'positive' or 'negative'" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("news_feedback")
    .insert({
      type,
      ticker,
      headline,
      url: url || null,
      sentiment: sentiment || null,
      reason,
      created_by: created_by || "unknown",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("news_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

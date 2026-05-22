import { NextResponse } from "next/server";
import { getInstrument } from "@/lib/mbc/instruments";

export async function GET(_req, { params }) {
  const { id } = await params;
  try {
    return NextResponse.json(getInstrument(id)); // full def: stem, items, responseOptions, bands
  } catch {
    return NextResponse.json({ error: "Unknown instrument" }, { status: 404 });
  }
}

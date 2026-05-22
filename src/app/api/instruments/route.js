import { NextResponse } from "next/server";
import { listInstruments } from "@/lib/mbc/instruments";

export async function GET() {
  return NextResponse.json(listInstruments()); // [{ id, name, construct }]
}

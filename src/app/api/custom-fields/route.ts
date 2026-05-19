import { NextResponse } from "next/server"
import { getFieldDefinitions } from "@/actions/customFields"

// GET /api/custom-fields — lista campos personalizados do workspace ativo
export async function GET() {
  const fields = await getFieldDefinitions()
  return NextResponse.json(fields)
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { loadSummary } from '../../../lib/load-summary'

export async function GET(request) {
    const summary = await loadSummary()
    return NextResponse.json(summary)
}

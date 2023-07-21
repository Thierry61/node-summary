// Rely on my own caching (to allow computing transaction rate)
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { loadSummary } from '../../../lib/load-summary'

export async function GET(_request) {
    const summary = await loadSummary()
    // Note that an error doesn't generate a HTTP error status
    // but is displayed in a regular component instead
    return NextResponse.json(summary)
}

// Rely on my own caching (to allow computing transaction rate)
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { loadSummary } from '../../../lib/load-summary'

export async function GET(_request) {
    const summary = await loadSummary()
    if (summary.err == undefined) {
        return new NextResponse('', { status: 200, statusCode: 'OK'})
    } else {
        // Here a HTTP error status is generated (contrary to API summary route)
        return NextResponse.json(summary, { status: 503, statusCode: 'Service Unavailable' })
    }
}

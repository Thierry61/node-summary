export const dynamic = 'force-dynamic'

import { loadSummary } from '../lib/load-summary'
import Card from './card'

// Round to 1 digit precision and keep possible .0 at the end
function digitPrecision(val) {
  let res = (Math.round(val * 10) / 10).toString()
  if (res.charAt(res.length - 2) != '.')
    res = res + ".0"
  return res

}

// Generates GB from byte size with 1 digit precision
function formatSize(size) {
  return digitPrecision(size / 1E9) + " GB"
}

// Format days (TODO: Use years, months, days, hours and keep only the 2 higher units)
function formatDays(days) {
  let res = digitPrecision(days)
  return res + " days"
}

// Format percentage with 1 digit precision
function formatPercent(percent) {
  let res = digitPrecision(percent)
  return res + " %"
}

// Format seconds in HH:MM:SS format with HH part omitted if less than 3600 seconds
function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  let seconds = totalSeconds % 3600
  const minutes = Math.floor(seconds / 60)
  seconds = seconds % 60
  const res = [hours, minutes, seconds]
    .filter((v, i) => v > 0 || i > 0)
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
  return res
}

// Format bitcoin amount to exactly 8 digits precision
function formatBitcoinAmount(amount) {
  let res = amount.toString()
  let dotPosition = res.indexOf('.')
  if (dotPosition == -1) {
    res += "."
    dotPosition = res.length - 1
  }
  res = res.padEnd(dotPosition + 8 + 1, '0')
  return res + " ₿"
}

function formatFee(fee) {
  return fee.toString() + " sat/vB"
}

export default async function Home() {
  const summary = await loadSummary()
  return (
    <main className="flex flex-col gap-1 m-1 w-96 text-sm">
      <Card title={"Blockchain"} items={[
        {Height: summary.headers}, {"Difficulty epoch": summary.diff_epoch}, {"Halving epoch": summary.halving_epoch}
      ]}/>
      <Card title={"Mempool"} items={[
        {"Transactions": summary.mempool.ntx}, {"Fees": formatBitcoinAmount(summary.mempool.fees)}
      ]}/>
      <Card title={"Next block"} items={[
        {"Transactions": summary.template.ntx}, {"Fees": formatBitcoinAmount(summary.template.fees)},
        {"Time since last block": formatSeconds(summary.time_since_last_bloc)}
      ]}/>
      <Card title={"Next retarget"} items={[
        {"Remaining blocks": summary.next_retarget.blocks}, {"Estimated delay": formatDays(summary.next_retarget.days)},
        {"Estimated adjustement": formatPercent(summary.next_retarget.estimated_diff_adj_percent)},
        {"Last adjustement": formatPercent(summary.prev_diff_adj_percent)}
      ]}/>
      <Card title={"Next halving"} items={[
        {"Remaining blocks": summary.next_halving.blocks}, {"Estimated delay": formatDays(summary.next_halving.days)}
      ]}/>
      <Card title={"Node"} items={[
        {"Upload": formatSize(summary.totalbytessent)}, {"Download": formatSize(summary.totalbytesrecv)},
        {"Data size": formatSize(summary.size_on_disk)}, {"Uptime": formatDays(summary.uptime_days)}
      ]}/>
      {/* Not publicly routable nodes are counted in the total but not are displayed apart, electrum server is one such node */}
      <Card title={"Peers"} items={[
        {"Total": summary.peers.total}, {"IPv4": summary.peers.ipv4}, {"IPv6": summary.peers.ipv6}, {"Onion": summary.peers.onion}
      ]}/>
      <Card title={"Recommended fees"} items={[
        {"Immediate": formatFee(summary.feerates["1"])}, {"1 hour": formatFee(summary.feerates["6"])}, {"1 day": formatFee(summary.feerates["144"])}
      ]}/>
    </main>
  )
}

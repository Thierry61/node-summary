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
  return [digitPrecision(size / 1E9),  "GB"]
}

// Generate plural s for value != 1
function s(val) {
  return val == 1 ? "" : "s"
}

// Format days. Use the 2 possible higher units of: years, months/weeks, days, hours, minutes
const durations = [
  { unit: "year", days: 365.25 },
  { unit: "month", days: 365.25/12 },
  { unit: "week", days: 7 },
  { unit: "day", days: 1 },
  { unit: "hour", days: 1/24 },
  { unit: "minute", days: 1/24/60 },
]
function formatDays(days) {
  // Note that last element is not iterated
  for (let i = 0; i < durations.length - 1; i++) {
    const hiDuration = durations[i]
    if (days > hiDuration.days) {
      // floor instead of round to get 9 months 21 days instead 10 months -10 days
      let hi = Math.floor(days / hiDuration.days)
      // Display months + days instead of months + weeks
      const lowDuration = hiDuration.unit == "month" ? durations[i + 2] : durations[i + 1]
      let low = Math.round((days - hi * hiDuration.days) / lowDuration.days)
      // Adjust hi and low to get 5 days instead of 4 days 24 hours
      if (Math.abs(low * lowDuration.days - hiDuration.days) < Number.EPSILON) {
        hi += 1
        low = 0
      }
      // Don't display nul low value and return regular (value, unit) pair instead
      if (low == 0) {
        return [hi, hiDuration.unit + s(hi)]
      }
      return [
        <div key="2" className='flex justify-end gap-1'>
          <div>{hi}</div>
          <div className='font-sans text-gray-400'>{hiDuration.unit + s(hi)}</div>
          <div>{low}</div>
        </div>,
        lowDuration.unit + s(low)
      ]
    }
  }
  // Special case for last element (display minutes in regular (value, unit) pair format)
  const lastDuration = durations[durations.length - 1]
  let res = Math.round(days / lastDuration.days)
  return [res, lastDuration.unit + s(res)]
}

// Format percentage with 1 digit precision
function formatPercent(percent) {
  let res = digitPrecision(percent)
  return [res, "%"]
}

// Format seconds in HH:MM:SS format with HH part omitted if less than 3600 seconds
function formatSeconds(totalSeconds) {
  const absoluteSeconds = Math.abs(totalSeconds)
  const sign = totalSeconds >= 0 ? '' : '-'
  const hours = Math.floor(absoluteSeconds / 3600)
  let seconds = absoluteSeconds % 3600
  const minutes = Math.floor(seconds / 60)
  seconds = seconds % 60
  const res = [hours, minutes, seconds]
    .filter((v, i) => v > 0 || i > 0)
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
  return [sign + res, hours > 0 ? "hh:mm:ss" : "mm:ss"]
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
  return [res, "btc"]
}

function formatFee(fee) {
  return [fee, "sats/vB"]
}

function formatRate(rate) {
  return rate === undefined ? undefined : [digitPrecision(rate), "txns/s"]
}

function formatBlocks(val) {
  return [val, "block" + s(val)]
}

function formatRetargets(val) {
  return [val, "retarget" + s(val)]
}

// TXN is abbreviation for transactions (https://en.wikipedia.org/wiki/TXN#:~:text=TXN%2C%20abbreviation%20for%20transaction%20(disambiguation))
function formatTransactions(val) {
  return [val, "txns"]
}

function formatPeers(val) {
  return [val, "node" + s(val)]
}

function formatEpoch(epoch) {
  const digit = epoch % 10
  const tens = Math.floor(epoch / 10) % 10
  const ord = (digit == 1 && tens != 1) ? 'st' : (digit == 2 && tens != 1) ? 'nd' : (digit == 3 && tens != 1) ? 'rd' : 'th'
  return [epoch, <div key="1"><sup>{ord}</sup> epoch</div>]
}

export default async function Cards({summary}) {
  return (
    <div className="text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
      <Card title={"Blockchain"} items={[
        {"Block height": [summary.headers, "blocks-1"]},
        {"Difficulty epoch": formatEpoch(summary.diff_epoch)},
        {"Halving epoch": formatEpoch(summary.halving_epoch)}
      ]}/>
      <Card title={"Recommended fees"} items={[
        {"ASAP": formatFee(summary.feerates["1"])},
        {"1 hour": formatFee(summary.feerates["6"])},
        {"1 day": formatFee(summary.feerates["144"])}
      ]}/>
      <Card title={"Mempool"} items={[
        {"Transactions": formatTransactions(summary.mempool.ntx)},
        {"Fees": formatBitcoinAmount(summary.mempool.fees)},
        {"TPS": formatRate(summary.mempool.ntx_per_second)}
      ]}/>
      <Card title={"Next block"} items={[
        {"Transactions": formatTransactions(summary.template.ntx)},
        {"Fees": formatBitcoinAmount(summary.template.fees)},
        {"Elapsed time": formatSeconds(summary.time_since_last_bloc)}
      ]}/>
      <Card title={"Next retarget"} items={[
        {"Blocks left": formatBlocks(summary.next_retarget.blocks)},
        {"Estim. adjustment": formatPercent(summary.next_retarget.estimated_diff_adj_percent)},
        {"Last adjustment": formatPercent(summary.prev_diff_adj_percent)},
        {"Estimated delay": formatDays(summary.next_retarget.days)},
      ]}/>
      <Card title={"Next halving"} items={[
        {"Blocks left": formatBlocks(summary.next_halving.blocks)},
        {"Retargets left": formatRetargets(summary.next_halving.retargets)},
        {"Estimated delay": formatDays(summary.next_halving.days)}
      ]}/>
      <Card title={"Node"} items={[
        {"Uptime": formatDays(summary.uptime_days)},
        {"Upload": formatSize(summary.totalbytessent)},
        {"Download": formatSize(summary.totalbytesrecv)},
        {"Data size": formatSize(summary.size_on_disk)}
      ]}/>
      <Card title={`Peers (${summary.peers.total})`} items={[
        {"IPv4": formatPeers(summary.peers.ipv4)},
        {"IPv6": formatPeers(summary.peers.ipv6)},
        {"Onion": formatPeers(summary.peers.onion)},
        /* Electrum server is an example of a not publicly routable node */
        {"Not publicly routable": formatPeers(summary.peers.not_publicly_routable)}
      ]}/>
      <Card title={"Top versions"} items={
        summary.sub_versions.filter(sv => !sv[0].startsWith("/electrs")).slice(0, 4).map(sv => {
          let o = {}
          o[sv[0]] = formatPeers(sv[1])
          return o
        })}/>
    </div>
  )
}

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

// Format flow rate
function formatThroughput(summary, property) {
  const uptime = summary.uptime_days
  const size = summary[property]
  const res = Math.round(uptime <= 0 ? "" : size/uptime/3600/1000)
  let update = true
  if (summary.last_res) {
    const last_uptime = summary.last_res.uptime_days
    const last_size = summary.last_res[property]
    const last_res = Math.round(uptime <= 0 ? "" : last_size/last_uptime/3600/1000)
    update = res != last_res
  }
  return [res, "KB/s", update]
}

// Format percentage with 1 digit precision
function formatPercent(summary, properties) {
  const rounded_percent = digitPrecision(properties.reduce((acc, property) => acc[property], summary))
  const rounded_last_percent = summary.last_res ?
    digitPrecision(properties.reduce((acc, property) => acc[property], summary.last_res)) :
    undefined
  return [rounded_percent, "%", rounded_percent != rounded_last_percent]
}

// Format seconds in HH:MM:SS format with HH part omitted if less than 3600 seconds
function formatSeconds(summary, property) {
  const totalSeconds = summary[property]
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
  const last_totalSeconds = (summary.last_res ?? {})[property]
  return [sign + res, hours > 0 ? "hh:mm:ss" : "mm:ss", totalSeconds != last_totalSeconds]
}

// Format bitcoin amount to exactly 8 digits precision
function formatBitcoinAmount(summary, property) {
  const amount = summary[property].fees
  let res = amount.toString()
  let dotPosition = res.indexOf('.')
  if (dotPosition == -1) {
    res += "."
    dotPosition = res.length - 1
  }
  res = res.padEnd(dotPosition + 8 + 1, '0')
  const last_amount = summary.last_res ? summary.last_res[property].fees : undefined
  return [res, "btc", amount != last_amount]
}

// Same without 0 padding
// Don't detect if value has changed since this happens once every 4 years
function formatReward(summary, delta) {
  let epoch = summary.halving_epoch + delta
  let reward = 50/(1<<epoch)
  return [reward, "btc"]
}

function formatFee(summary, blocks) {
  const fee = summary.feerates[blocks]
  const rounded_fee = digitPrecision(fee)
  const rounded_last_fee = summary.last_res ? digitPrecision(summary.last_res.feerates[blocks]) : undefined
  return [rounded_fee, "sats/vB", rounded_fee != rounded_last_fee]
}

function formatTPS(summary, optional_property) {
  const parent = optional_property ? summary[optional_property] : summary
  const rate = parent.ntx_per_second
  if (rate == undefined)
    return undefined
  const rounded_rate = digitPrecision(rate)
  const last_parent = summary.last_res ? optional_property ? summary.last_res[optional_property] : summary.last_res : {}
  const last_rate = last_parent.ntx_per_second
  const last_rounded_rate = last_rate == undefined ? undefined : digitPrecision(last_rate)
  return [rounded_rate, "txns/s", rounded_rate != last_rounded_rate]
}

function formatBlocks(summary, property) {
  const val = summary[property].blocks
  const last_val = summary.last_res ? summary.last_res[property].blocks : undefined
  return [val, "block" + s(val), val != last_val]
}

function formatRetargets(val) {
  return [val, "retarget" + s(val)]
}

// TXN is abbreviation for transactions (https://en.wikipedia.org/wiki/TXN#:~:text=TXN%2C%20abbreviation%20for%20transaction%20(disambiguation))
function formatTransactions(summary, optional_property) {
  const parent = optional_property ? summary[optional_property] : summary
  const val = parent.ntx
  const last_parent = summary.last_res ? optional_property ? summary.last_res[optional_property] : summary.last_res : {}
  const last_val = last_parent.ntx
  return [val, "txns", val != last_val]
}

function formatPeers(summary, property) {
  const val = summary.peers[property]
  const last_val = summary.last_res ? summary.last_res.peers[property] : {}
  return [
    <div key="2" className='flex justify-end gap-1'>
      <div className={val.in != last_val.in ? "animate-update" : ""}>{val.in}</div>
      <div className='font-sans text-gray-400'>in</div>
      <div className={val.out != last_val.out ? "animate-update" : ""}>{val.out}</div>
    </div>,
    "out"
  ]
}

function formatNodes(val) {
  return [val, "node" + s(val)]
}

function formatEpoch(summary, property) {
  const epoch = summary[property]
  const digit = epoch % 10
  const tens = Math.floor(epoch / 10) % 10
  const ord = (digit == 1 && tens != 1) ? 'st' : (digit == 2 && tens != 1) ? 'nd' : (digit == 3 && tens != 1) ? 'rd' : 'th'
  const last_epoch = (summary.last_res ?? {})[property]
  return [epoch, <div key="1"><sup>{ord}</sup> epoch</div>, epoch != last_epoch]
}

export default async function Cards({summary}) {
  return (
    <div className="text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
      <Card title={"Blockchain"} items={[
        {"Transactions": formatTransactions(summary)},
        // In reality block height is the number of blocks in the blockchain minus 1 (but who cares?)
        {"Block height": [summary.headers, "blocks", summary.headers != (summary.last_res ?? {}).headers]},
        {"Difficulty epoch": formatEpoch(summary, "diff_epoch")},
        {"Halving epoch": formatEpoch(summary, "halving_epoch")},
      ]}/>
      <Card title={"Recommended fees"} items={[
        {"ASAP": formatFee(summary, "1")},
        {"1 hour": formatFee(summary, "6")},
        {"6 hours": formatFee(summary, "36")},
        {"1 day": formatFee(summary, "144")},
      ]}/>
      <Card title={"Mempool"} items={[
        {"Transactions": formatTransactions(summary, "mempool")},
        {"Fees": formatBitcoinAmount(summary, "mempool")},
        {"Instant TPS": formatTPS(summary, "mempool")},
        {"Monthly TPS": formatTPS(summary)},
      ]}/>
      <Card title={"Next block"} items={[
        {"Transactions": formatTransactions(summary, "template")},
        {"Fees": formatBitcoinAmount(summary, "template")},
        {"Current reward": formatReward(summary, -1)},
        {"Elapsed time": formatSeconds(summary, "time_since_last_bloc")},
      ]}/>
      <Card title={"Next retarget"} items={[
        {"Blocks left": formatBlocks(summary, "next_retarget")},
        {"Estim. adjustment": formatPercent(summary, ["next_retarget", "estimated_diff_adj_percent"])},
        {"Last adjustment": formatPercent(summary, ["prev_diff_adj_percent"])},
        {"Estim. delay": formatDays(summary.next_retarget.days)},
      ]}/>
      <Card title={"Next halving"} items={[
        {"Blocks left": formatBlocks(summary, "next_halving")},
        {"Diff. retargets": formatRetargets(summary.next_halving.retargets)},
        {"New reward": formatReward(summary, 0)},
        {"Estim. delay": formatDays(summary.next_halving.days)},
      ]}/>
      <Card title={"Node"} items={[
        {"Uptime": formatDays(summary.uptime_days)},
        {"Upload": formatThroughput(summary, "totalbytessent")},
        {"Download": formatThroughput(summary, "totalbytesrecv")},
        {"Data size": formatSize(summary.size_on_disk)},
      ]}/>
      <Card title={`Peers (${summary.peers.total})`} items={[
        {"IPv4": formatPeers(summary, "ipv4")},
        {"IPv6": formatPeers(summary, "ipv6")},
        {"Onion": formatPeers(summary, "onion")},
        /* Electrum server is an example of a not publicly routable node */
        {"Not publicly routable": formatPeers(summary, "not_publicly_routable")}
      ]}/>
      <Card title={"Top versions"} items={
        summary.sub_versions.filter(sv => !sv[0].startsWith("/electrs")).slice(0, 4).map(sv => {
          let o = {}
          let agent = sv[0]
          const maxLen = 23
          if (agent.length > maxLen)
            agent = agent.slice(0, maxLen-1) + "…"
          o[agent] = formatNodes(sv[1])
          return o
        })}/>
    </div>
  )
}

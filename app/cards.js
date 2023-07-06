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

// Format days (TODO: Use years, months, days, hours and keep only the 2 higher units)
function formatDays(days) {
  let res = digitPrecision(days)
  return [res, "days"]
}

// Format percentage with 1 digit precision
function formatPercent(percent) {
  let res = digitPrecision(percent)
  return [res, "%"]
}

// Format seconds in HH:MM:SS format with HH part omitted if less than 3600 seconds
function formatSeconds(totalSeconds) {
  const absoluteSeconds = Math.abs(totalSeconds)
  const sign = absoluteSeconds >= 0 ? '' : '-'
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
  return [val, "blocks"]
}

function formatRetargets(val) {
  return [val, "adjust."]
}

// TXN is abbreviation for transactions (https://en.wikipedia.org/wiki/TXN#:~:text=TXN%2C%20abbreviation%20for%20transaction%20(disambiguation))
function formatTransactions(val) {
  return [val, "txns"]
}

function formatPeers(val) {
  return [val, "nodes"]
}

function formatEpoch(epoch) {
  const digit = epoch % 10;
  const ord = digit == 1 ? 'st' : digit == 2 ? 'nd' : digit == 3 ? 'rd' : 'th'
  return [epoch, <div key="1"><sup>{ord}</sup> epoch</div>]
}

export default async function Cards({summary}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
      <Card title={"Blockchain"} items={[
        {"Height": formatBlocks(summary.headers)},
        {"Difficulty epoch": formatEpoch(summary.diff_epoch)},
        {"Halving epoch": formatEpoch(summary.halving_epoch)}
      ]}/>
      <Card title={"Recommended fees"} items={[
        {"Immediate": formatFee(summary.feerates["1"])},
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
        {"Remaining blocks": formatBlocks(summary.next_retarget.blocks)},
        {"Estimated delay": formatDays(summary.next_retarget.days)},
        {"Estim. adjustment": formatPercent(summary.next_retarget.estimated_diff_adj_percent)},
        {"Last adjustment": formatPercent(summary.prev_diff_adj_percent)}
      ]}/>
      <Card title={"Next halving"} items={[
        {"Remaining blocks": formatBlocks(summary.next_halving.blocks)},
        {"Remaining retargets": formatRetargets(summary.next_halving.retargets)},
        {"Estimated delay": formatDays(summary.next_halving.days)}
      ]}/>
      <Card title={"Node"} items={[
        {"Uptime": formatDays(summary.uptime_days)},
        {"Upload": formatSize(summary.totalbytessent)},
        {"Download": formatSize(summary.totalbytesrecv)},
        {"Data size": formatSize(summary.size_on_disk)}
      ]}/>
      <Card title={`${summary.peers.total} peers`} items={[
        {"IPv4": formatPeers(summary.peers.ipv4)},
        {"IPv6": formatPeers(summary.peers.ipv6)},
        {"Onion": formatPeers(summary.peers.onion)},
        /* Electrum server is an example of a not publicly routable node */
        {"Not publicly routable": formatPeers(summary.peers.not_publicly_routable)}
      ]}/>
      <Card title={"Top versions"} items={summary.sub_versions.slice(0, 4).map(sv => {
          let o = {}
          o[sv[0]] = formatPeers(sv[1])
          return o
        })}/>
    </div>
  )
}

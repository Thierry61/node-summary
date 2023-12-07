import React from 'react'
import Card from './card'

// Round to 1 digit precision and keep possible .0 at the end
function digitPrecision(val) {
  let res = (Math.round(val * 10) / 10).toString()
  if (res.charAt(res.length - 2) != '.')
    res = res + ".0"
  return res
}

// Generates GB from byte size with 1 digit precision
function cbSize(size) {
  return [[digitPrecision(size / 1E9),  "GB"]]
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
function cbDays(days) {
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
        return [[hi, hiDuration.unit + s(hi)]]
      }
      return [[hi, hiDuration.unit + s(hi)], [low, lowDuration.unit + s(low)]]
    }
  }
  // Special case for last element (display minutes in regular (value, unit) pair format)
  const lastDuration = durations[durations.length - 1]
  let res = Math.round(days / lastDuration.days)
  return [[res, lastDuration.unit + s(res)]]
}

// Format flow rate
// Note: this callback has an additional argument
function cbThroughput(size, uptimeDays) {
  const uptimeSeconds = uptimeDays*24*3600
  const res = Math.round(uptimeDays <= 0 ? "" : size/1000/uptimeSeconds)
  return [[res, "KB/s"]]
}

// Format percentage with 1 digit precision
function cbPercent(val) {
  const rounded_percent = digitPrecision(val)
  return [[rounded_percent, "%"]]
}

// Format seconds in HH:MM:SS format with HH part omitted if less than 3600 seconds
function cbSeconds(totalSeconds) {
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
  return [[sign + res, hours > 0 ? "hh:mm:ss" : "mm:ss"]]
}

// Format bitcoin amount to exactly 8 digits precision
function cbBitcoinAmount(amount) {
  let res = amount.toString()
  let dotPosition = res.indexOf('.')
  if (dotPosition == -1) {
    res += "."
    dotPosition = res.length - 1
  }
  res = res.padEnd(dotPosition + 8 + 1, '0')
  // Display regular 5 digits + dimmed last 3 digits (note that ledger or kraken display only the 5 digits)
  const splitPosition = res.length - 3
  return [[
    <>
      <span>{res.substring(0, splitPosition)}</span>
      <span className="text-gray-400">{res.substring(splitPosition)}</span>
    </>,
    "btc"
  ]]
}

// Compute reward from halving epoch
// Note: this callback has an additional argument
function cbReward(current_epoch, delta) {
  let epoch = current_epoch + delta
  // TODO: Improve this before 2040! (next halving new reward field with more than 8 digits)
  let reward = 50/(1<<epoch)
  return cbBitcoinAmount(reward)
}

function cbFee(fee) {
  const rounded_fee = digitPrecision(fee)
  return [[rounded_fee, "sats/vB"]]
}

function cbTPS(rate) {
  const rounded_rate = digitPrecision(rate)
  return [[rounded_rate, "txns/s"]]
}

function cbBlocks(val) {
  return [[val, "block" + s(val)]]
}

function cbRetargets(val) {
  return [[val, "retarget" + s(val)]]
}

// TXN is abbreviation for transactions (https://en.wikipedia.org/wiki/TXN#:~:text=TXN%2C%20abbreviation%20for%20transaction%20(disambiguation))
function cbTransactions(val) {
  return [[val, "txns"]]
}

function cbPeers(val) {
  return [[val.in, "in"], [val.out, "out"]]
}

function cbNodes(val) {
  return [[val, "node" + s(val)]]
}

function cbEpoch(epoch) {
  const digit = epoch % 10
  const tens = Math.floor(epoch / 10) % 10
  const ord = (digit == 1 && tens != 1) ? 'st' : (digit == 2 && tens != 1) ? 'nd' : (digit == 3 && tens != 1) ? 'rd' : 'th'
  return [[epoch, <div key="1"><sup>{ord}</sup> epoch</div>]]
}

// Function computing any displayed properties. They are computed twice:
// - once with current values
// - once with previous values (about 5 seconds ago)
// and then they are compared to derive a modified flag used to trigger an animation.
// Function takes as inputs:
// - callback function that computes an array of [value, unit] pairs
// - summary variable (json data)
// - array of properties to traverse to get the data
// - optional additional argument for callback
// It returns an array of {v: <value>, u: <unit>, m: <modified flag>} objects.
function raw_format(cb, summary, properties, optional_arg) {
  // Compute current array of [value, unit] pairs
  const val = properties.reduce((acc, property) => acc[property], summary)
  // Handles undefined instant TPS at startup
  if (val == undefined) {
    return [{v: undefined, u: undefined, m: false}]
  }
  const val_unit_pairs = cb(val, optional_arg)
  // Values are considered modified if there are no previous data
  if (! summary.last_res) {
    return val_unit_pairs.map((vu) => ({v: vu[0], u: vu[1], m: true}))
  }
  // Compute previous array of [value, unit] pairs
  const last_val = properties.reduce((acc, property) => acc[property], summary.last_res)
  // Values are considered modified if previous value is undefined
  if (last_val == undefined) {
    return val_unit_pairs.map((vu) => ({v: vu[0], u: vu[1], m: true}))
  }
  const last_val_unit_pairs = cb(last_val, optional_arg)
  // Values are considered modified if array length changes
  let modified = val_unit_pairs.length != last_val_unit_pairs.length
  return val_unit_pairs.map((vu, i) => {
    // Current value is considered modified if it changes or its unit changes
    // Note that we need to manage values and units in jsx format (btc amount and ordinal epoch numbers) and also we need to manage possible undefined value
    const myToString = v => v == undefined ? "" : React.isValidElement(v) ? JSON.stringify(v) : v.toString()
    const m = modified || myToString(vu[0]) != myToString(last_val_unit_pairs[i][0]) || myToString(vu[1]) != myToString(last_val_unit_pairs[i][1])
    return {v: vu[0], u: vu[1], m}
  })
}

// Intermediate functions to insert a global modified flag indicating if the title itself is modified
// (false by default, but needed for sub-versions when their ordering changes)
function format_items(items, modified_flag) {
  return {m: modified_flag, items}
}
function format(cb, summary, properties, optional_arg) {
  const items = raw_format(cb, summary, properties, optional_arg)
  return format_items(items, false)
}

// Computes 4 top sub-version strings
function topVersions(summary) {
  const ret = summary.sub_versions.filter(sv => !sv[0].startsWith("/electrs")).slice(0, 4).map((sv, index) => {
    let o = {}
    let agent = sv[0]
    const maxLen = 23
    if (agent.length > maxLen)
      agent = agent.slice(0, maxLen-1) + "…"
    let items = cbNodes(sv[1])
    items = [{v: items[0][0], u: items[0][1], m: false}]
    o[agent] = items
    return o
  })
  return ret
}

export default async function Cards({summary}) {
  // Pre-compute 4 top previous versions
  const prev_sv_items = !summary.last_res ? undefined : topVersions(summary.last_res)
  return (
    <div className="text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
      <Card title={"Blockchain"} items={[
        {"Transactions": format(cbTransactions, summary, ["ntx"])},
        // In reality block height is the number of blocks in the blockchain minus 1 (but who cares?)
        {"Block height": format(cbBlocks, summary, ["headers"])},
        {"Difficulty epoch": format(cbEpoch, summary, ["diff_epoch"])},
        {"Halving epoch": format(cbEpoch, summary, ["halving_epoch"])},
      ]}/>
      <Card title={"Recommended fees"} items={[
        {"ASAP": format(cbFee, summary, ["feerates", "1"])},
        {"1 hour": format(cbFee, summary, ["feerates", "6"])},
        {"6 hours": format(cbFee, summary, ["feerates", "36"])},
        {"1 day": format(cbFee, summary, ["feerates", "144"])},
      ]}/>
      <Card title={"Mempool"} items={[
        {"Transactions": format(cbTransactions, summary, ["mempool", "ntx"])},
        {"Fees": format(cbBitcoinAmount, summary, ["mempool", "fees"])},
        {"Instant TPS": format(cbTPS, summary, ["mempool", "ntx_per_second"])},
        {"Monthly TPS": format(cbTPS, summary, ["ntx_per_second"])},
      ]}/>
      <Card title={"Next block"} items={[
        {"Transactions": format(cbTransactions, summary, ["template", "ntx"])},
        {"Fees": format(cbBitcoinAmount, summary, ["template", "fees"])},
        {"Reward": format(cbReward, summary, ["halving_epoch"], -1)},
        {"Elapsed time": format(cbSeconds, summary, ["time_since_last_bloc"])},
      ]}/>
      <Card title={"Next retarget"} items={[
        {"Blocks left": format(cbBlocks, summary, ["next_retarget", "blocks"])},
        {"Estim. adjustment": format(cbPercent, summary, ["next_retarget", "estimated_diff_adj_percent"])},
        {"Last adjustment": format(cbPercent, summary, ["prev_diff_adj_percent"])},
        {"Estim. delay": format(cbDays, summary, ["next_retarget", "days"])},
      ]}/>
      <Card title={"Next halving"} items={[
        {"Blocks left": format(cbBlocks, summary, ["next_halving", "blocks"])},
        {"Diff. retargets": format(cbRetargets, summary, ["next_halving", "retargets"])},
        {"New reward": format(cbReward, summary, ["halving_epoch"], 0)},
        {"Estim. delay": format(cbDays, summary, ["next_halving", "days"])},
      ]}/>
      <Card title={"Node"} items={[
        {"Uptime": format(cbDays, summary, ["uptime_days"])},
        // Note that there is a very small error when computing modified flag because summary.uptime_days is used for both current and previous values
        // (but to put this on perspective after one hour uptime error is only 5/3600 = 0.14% and error decreases more and more when time passes)
        {"Upload": format(cbThroughput, summary, ["totalbytessent"], summary.uptime_days)},
        {"Download": format(cbThroughput, summary, ["totalbytesrecv"], summary.uptime_days)},
        {"Data size": format(cbSize, summary, ["size_on_disk"])},
      ]}/>
      <Card title={`Peers (${summary.peers.total})`} items={[
        {"IPv4": format(cbPeers, summary, ["peers", "ipv4"])},
        {"IPv6": format(cbPeers, summary, ["peers", "ipv6"])},
        {"Onion": format(cbPeers, summary, ["peers", "onion"])},
        /* Electrum server is an example of a not publicly routable node */
        {"Not publicly routable": format(cbPeers, summary, ["peers", "not_publicly_routable"])},
      ]}/>
      <Card title={"Top versions"} items={
        topVersions(summary).map((sv, index) => {
          let o = {}
          let items = Object.values(sv)[0]
          // Compare with previous value at same index
          items[0].m = !prev_sv_items ? true : Object.values(prev_sv_items[index])[0][0].v != items[0].v
          // Take into account version ordering change to compute modified flag on item titles
          let agent = Object.keys(sv)[0]
          const modified_title = !prev_sv_items ? true : agent != Object.keys(prev_sv_items[index])[0]
          o[agent] = format_items(items, modified_title)
          return o
        })}/>
    </div>
  )
}

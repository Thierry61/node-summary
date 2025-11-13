// loadSummary function in library is shared between server component and API route

const fs = require('fs/promises')

const difficultyAdjustmentBlockCount = 2016
const targetBlockTimeSeconds = 600
// 24 hours, 6 blocks per hour
const targetBlocksPerDay = 144
// Remark: this isn't a multiple of 2016
const halvingBlockCount = 210000

// Timings are logged at level 1 only when batch duration is > 3s
const timingsLevel1Limit = 3000

function format_ms(v) {
    return v.toFixed(2).padStart(9, ' ')
}

// Compute fetch request timings
let timings = []
let timingsOrigin
function initTimings() {
    timings = []
    timingsOrigin = performance.now()
}
function addTiming(method, time) {
    timings.push([method, time])
}
function displayingTimings() {
    let previous = timingsOrigin
    for (const [method, time] of timings) {
        const duration = time - previous
        console.log(`${method.padEnd(17, ' ')}:${format_ms(duration)} ms`)
        previous = time
    }
}

// Call one specific Bitcoin RPC endpoint
async function rpcFetch(options, method, params) {
    options.body = JSON.stringify({"jsonrpc": "2.0", "id": "info", "method": method, "params": params})
    const rpcResult = await fetch(`${process.env.BITCOIND_HOST}:${process.env.BITCOIND_PORT}`, options)
    if (rpcResult.status != 200)
        return { method, error: rpcResult.statusText }
    if (process.env.TIMINGS_LEVEL) {
        const t = performance.now()
        addTiming(method, t)
    }
    return rpcResult.json()
}

// Function to keep 4 digits of precision (used for number of days, TPS and difficulty adjustments)
function precision4(n) {
    const abs_n = Math.abs(n)
    if (abs_n < 1e-10)
        return 0
    const magnitude = Math.pow(10, Math.floor(Math.log10(abs_n))+1)
    const res = Math.round(n/magnitude*10000)/10000*magnitude
    // Get rid of residual digits like 6.470000000000001
    const truncate = 1e10
    return Math.round(res*truncate)/truncate
}

// Test if an environment variable is undefined or the empty string
function isUndefinedOrEmpty(varName) {
    const val = process.env[varName]
    // console.log(`${varName}: ${val}`)
    return val == undefined || val == ""
}

// Caches some blocks. The cache is larger than necessary to manage chain reorg but in fact we only need:
// - current best block
// - previous difficulty epoch last block
// - current difficulty epoch first block
// For each block 3 pieces of information are retained:
// - time
// - difficulty
// - height
const hashMapCapacity = 9
const hash_map = new Map()
function add_to_hash_map(hash, time, difficulty, height, diff_epoch_first_block_height) {
    // Remove oldest entry but not an important one (first of current diff epoch or last of previous diff epoch)
    // except to replace them in case of reorg
    // Note that entries are in the order of entry insertion.
    if (hash_map.size >= hashMapCapacity) {
        const prev_diff_epoch_last_block_height = diff_epoch_first_block_height - 1
        let old_key = undefined
        for (const [key, value] of hash_map) {
            const important_height = value.height == diff_epoch_first_block_height || value.height == prev_diff_epoch_last_block_height
            if (!important_height || (important_height && height == value.height)) {
                old_key = key;
                break;
            }
        }
        hash_map.delete(old_key)
    }
    // Add new entry
    hash_map.set(hash, {time, difficulty, height})
}

// Define options for calling bitcoind RPC API
async function get_options() {
    let options = {
        method: "POST",
    }
    let userPass
    if (!isUndefinedOrEmpty("BITCOIND_COOKIE_PATH")) {
        userPass = await fs.readFile(process.env.BITCOIND_COOKIE_PATH, { encoding: 'utf8' })
        userPass = userPass.toString().trim()
        const [ username, password ] = userPass.split(':', 2)
        options.username = username
        options.password = password
    } else {
        if (!isUndefinedOrEmpty("BITCOIND_USERNAME") && !isUndefinedOrEmpty("BITCOIND_PASSWORD")) {
            options.username = process.env.BITCOIND_USERNAME
            options.password = process.env.BITCOIND_PASSWORD
            userPass=`${options.username}:${options.password}`
        }
    }
    if (userPass != undefined) {
        const authorizationHeader = `Basic ${Buffer.from(userPass).toString('base64')}`
        options.headers = { "Authorization": authorizationHeader }
    }
    return options;
}

// Call Bitcoin RPC endpoints to get summary
async function loadSummaryCached() {
    try {
        let options = await get_options()
        // options.next: { revalidate: process.env.REVALIDATE }, // doesn't work (because request is POST)
        // Do my own caching (but in fact this is implied with POST request)
        options.cache = 'no-store'

        // Parallel requests to bitcoin RPC server
        const mode = "CONSERVATIVE"
        let methods = [
            {method: "uptime", params: []},
            {method: "getblockchaininfo", params: []},
            {method: "getnettotals", params: []},
            {method: "getpeerinfo", params: []},
            {method: "getblocktemplate", params: [{rules: ["segwit"]}]},
            {method: "getmempoolinfo", params: []},
            {method: "estimatesmartfee", params: [1, mode]},    // ASAP
            {method: "estimatesmartfee", params: [6, mode]},    // 1 hour
            {method: "estimatesmartfee", params: [36, mode]},   // 6 hours
            {method: "estimatesmartfee", params: [144, mode]},  // 1 day
            {method: "getchaintxstats", params: []},
        ]
        let t0
        if (process.env.TIMINGS_LEVEL) {
            initTimings()
            t0 = performance.now()
        }
        let rpcResults = await Promise.all(methods.map(m => rpcFetch(options, m.method, m.params)))
        let res = {feerates: {}}
        let noTemplate = false
        for (let i = 0; i < rpcResults.length; i++) {
            let rpcResult = rpcResults[i]
            const method = methods[i].method
            if (rpcResult.error) {
                if (method == "getblocktemplate") {
                    // Allow error on getblocktemplate to make the site work during IDB
                    // Just indicate there are no transactions in the template => fees and ntx are 0
                    rpcResult = {result: {transactions: []}}
                    noTemplate = true
                }
                else
                    throw { method, status: rpcResult.error }
            }
            rpcResult = rpcResult.result
            switch (method) {
                case "uptime":
                    res.uptime_days = precision4(rpcResult/(24*3600))
                    break
                case "getblockchaininfo":
                    const diff_epoch = parseInt(Math.floor(rpcResult.blocks / difficultyAdjustmentBlockCount)) + 1
                    const halving_epoch = parseInt(Math.floor(rpcResult.blocks / halvingBlockCount)) + 1
                    res = {
                        ...res, diff_epoch, halving_epoch, blocks: rpcResult.blocks, blocks: rpcResult.blocks,
                        size_on_disk: rpcResult.size_on_disk, bestblockhash: rpcResult.bestblockhash
                    }
                    break
                case "getnettotals":
                    res = {...res, totalbytesrecv: rpcResult.totalbytesrecv, totalbytessent: rpcResult.totalbytessent}
                    break
                case "getpeerinfo":
                    const total = rpcResult.length
                    const ipv4 = {
                        in: rpcResult.filter(i => i.network == "ipv4" && i.connection_type == "inbound").length,
                        out: rpcResult.filter(i => i.network == "ipv4" && i.connection_type != "inbound").length
                    }
                    const ipv6 = {
                        in: rpcResult.filter(i => i.network == "ipv6" && i.connection_type == "inbound").length,
                        out: rpcResult.filter(i => i.network == "ipv6" && i.connection_type != "inbound").length
                    }
                    const onion = {
                        in: rpcResult.filter(i => i.network == "onion" && i.connection_type == "inbound").length,
                        out: rpcResult.filter(i => i.network == "onion" && i.connection_type != "inbound").length
                    }
                    const not_publicly_routable = {
                        in: rpcResult.filter(i => i.network == "not_publicly_routable" && i.connection_type == "inbound").length,
                        out: rpcResult.filter(i => i.network == "not_publicly_routable" && i.connection_type != "inbound").length
                    }
                    res.peers = {total, ipv4, ipv6, onion, not_publicly_routable}
                    let sub_versions = rpcResult.reduce((h, p) => {h[p.subver] = (h[p.subver] ?? 0) + 1; return h}, {})
                    sub_versions = Object.entries(sub_versions)
                    sub_versions.sort((a, b) => b[1] - a[1])
                    res.sub_versions = sub_versions
                    break
                case "getblocktemplate":
                    const fees = rpcResult.transactions.reduce((t, i) => t + i.fee, 0)/1E8
                    const ntx = rpcResult.transactions.length
                    res.template = {fees, ntx}
                    break
                case "getmempoolinfo":
                    res.mempool = {fees: rpcResult.total_fee, ntx: rpcResult.size}
                    break
                case "estimatesmartfee":
                    // We want sats per byte but raw results are in BTC per kilobyte, so we multiply them by 1E8/1E3 = 1E5
                    const feerate = rpcResult.feerate * 1E5
                    // Returns feerates with 3 digits precision
                    res.feerates[methods[i].params[0]] = Math.round(feerate*1000)/1000
                    break
                case "getchaintxstats":
                    res.ntx = rpcResult.txcount
                    res.ntx_per_second = precision4(rpcResult.txrate)
                    break
                default:
                    // To analyze results of a new method just uncomment following line
                    // console.debug(rpcResult)
            }
        }
        // Replace NaN smart fees with 0 during IDB
        if (noTemplate)
            for (const property in res.feerates)
                res.feerates[property] = 0
        let t1
        if (process.env.TIMINGS_LEVEL) {
            t1 = performance.now()
            if (process.env.TIMINGS_LEVEL == 2 || process.env.TIMINGS_LEVEL == 1 && t1 - t0 > timingsLevel1Limit) {
                displayingTimings()
                console.log(`1st batch (${methods.length} methods):${format_ms(t1 - t0)} ms`)
            }
            initTimings()
        }

        // Second batch of parallel requests (in sequence because they use information generated by first request batch)
        const diffEpochFirstBlockHeight = difficultyAdjustmentBlockCount * (res.diff_epoch - 1)
        const prevDiffEpochLastBlockHeight = diffEpochFirstBlockHeight - 1
        methods = [
            {method: "getblockhash", params: [diffEpochFirstBlockHeight]},
            {method: "getblockhash", params: [prevDiffEpochLastBlockHeight]},
        ]
        let block1 = "HIT"
        if (!hash_map.has(res.bestblockhash)) {
            methods.push({method: "getblock", params: [res.bestblockhash]})
            block1 = "MISS"
        }
        rpcResults = await Promise.all(methods.map(m => rpcFetch(options, m.method, m.params)))
        for (let i = 0; i < rpcResults.length; i++) {
            let rpcResult = rpcResults[i]
            const method = methods[i].method
            if (rpcResult.error)
                throw { method, error: rpcResult.error }
            rpcResult = rpcResult.result
            switch (method) {
                case "getblock":
                    add_to_hash_map(res.bestblockhash, rpcResult.time, rpcResult.difficulty, rpcResult.height, diffEpochFirstBlockHeight)
                    break
                case "getblockhash":
                    const height = methods[i].params[0]
                    const attributeName = (height == diffEpochFirstBlockHeight) ?
                        "diff_epoch_first_block_hash" :
                        "prev_diff_epoch_last_block_hash"
                    res[attributeName] = rpcResult
                    break
                default:
                    // To analyze results of a new method just uncomment following line
                    // console.debug(rpcResult)
            }
        }
        const bestblock = hash_map.get(res.bestblockhash)
        res.time = bestblock.time
        res.server_time = Date.now()
        res.time_since_last_block = Math.round(res.server_time/1000) - bestblock.time
        let t2
        if (process.env.TIMINGS_LEVEL) {
            t2 = performance.now()
            if (process.env.TIMINGS_LEVEL == 2 || process.env.TIMINGS_LEVEL == 1 && t2 - t1 > timingsLevel1Limit) {
                displayingTimings()
                console.log(`2nd batch (${methods.length} methods):${format_ms(t2 - t1)} ms, block1 = ${block1}`)
            }
            initTimings()
        }

        // Third batch of parallel requests
        methods = []
        let block2 = "HIT"
        if (!hash_map.has(res.diff_epoch_first_block_hash)) {
            methods.push({method: "getblock", params: [res.diff_epoch_first_block_hash]})
            block2 = "MISS"
        }
        let block3 = "HIT"
        if (!hash_map.has(res.prev_diff_epoch_last_block_hash)) {
            methods.push({method: "getblock", params: [res.prev_diff_epoch_last_block_hash]})
            block3 = "MISS"
        }
        if (methods.length > 0) {
            rpcResults = await Promise.all(methods.map(m => rpcFetch(options, m.method, m.params)))
            for (let i = 0; i < rpcResults.length; i++) {
                let rpcResult = rpcResults[i]
                const method = methods[i].method
                if (rpcResult.error)
                    throw { method, error: rpcResult.error }
                rpcResult = rpcResult.result
                switch (method) {
                    case "getblock":
                        add_to_hash_map(rpcResult.hash, rpcResult.time, rpcResult.difficulty, rpcResult.height, diffEpochFirstBlockHeight)
                        break
                    default:
                        // To analyze results of a new method just uncomment following line
                        // console.debug(rpcResult)
                }
            }
        }
        const diff_epoch_first_block = hash_map.get(res.diff_epoch_first_block_hash)
        res.diff_epoch_first_block_difficulty = diff_epoch_first_block.difficulty
        res.diff_epoch_first_block_time = diff_epoch_first_block.time
        const prev_diff_epoch_last_block = hash_map.get(res.prev_diff_epoch_last_block_hash)
        res.prev_diff_epoch_last_block_difficulty = prev_diff_epoch_last_block.difficulty
        const blocksSinceRetarget = res.blocks - diffEpochFirstBlockHeight
        let diffAdjPercent = 0
        let uncappedBlockRatio = 1
        if (blocksSinceRetarget != 0) {
            const dt = res.time - res.diff_epoch_first_block_time
            const predictedBlockCount = dt / targetBlockTimeSeconds
            uncappedBlockRatio = blocksSinceRetarget / predictedBlockCount
            let blockRatioPercent = 100 * uncappedBlockRatio
            if (blockRatioPercent > 400) {
                blockRatioPercent = 400
            }
            if (blockRatioPercent < 25) {
                blockRatioPercent = 25
            }
            diffAdjPercent = precision4(blockRatioPercent - 100)
        }
        const blocksToRetarget = difficultyAdjustmentBlockCount - blocksSinceRetarget
        const daysToRetarget = precision4(blocksToRetarget/targetBlocksPerDay/uncappedBlockRatio)
        const halvingFirstBlockHeight = halvingBlockCount * (res.halving_epoch - 1)
        // From 0 to 209999
        const blocksSinceHalving = res.blocks - halvingFirstBlockHeight
        // From 210000 to 1
        const blocksToHalving = halvingBlockCount - blocksSinceHalving
        const nextHalvingFirstBlockHeight = halvingBlockCount * res.halving_epoch
        const retargetBeforeNextHalvingHeight = Math.floor(nextHalvingFirstBlockHeight / difficultyAdjustmentBlockCount) * difficultyAdjustmentBlockCount
        const nextRetargetHeight = res.blocks + blocksToRetarget
        // From 104 to 0 (remark: next retarget can occur after the halving)
        const retargetsToHalving = 1 + (retargetBeforeNextHalvingHeight - nextRetargetHeight) / difficultyAdjustmentBlockCount
        const daysToHalving = precision4(blocksToHalving/targetBlocksPerDay)
        const prevDiffAdj = (res.diff_epoch_first_block_difficulty - res.prev_diff_epoch_last_block_difficulty)
        const prevDiffAdjPercent = precision4(prevDiffAdj / res.prev_diff_epoch_last_block_difficulty * 100)
        res = {
            ...res, prev_diff_adj_percent: prevDiffAdjPercent,
            next_retarget: {blocks: blocksToRetarget, days: daysToRetarget, estimated_diff_adj_percent: diffAdjPercent},
            next_halving: {blocks: blocksToHalving, retargets: retargetsToHalving, days: daysToHalving}
        }
        delete res.bestblockhash
        delete res.diff_epoch_first_block_hash
        delete res.diff_epoch_first_block_time
        delete res.diff_epoch_first_block_difficulty
        delete res.prev_diff_epoch_last_block_hash
        delete res.prev_diff_epoch_last_block_difficulty
        delete res.time
        res.revalidate=process.env.REVALIDATE
        if (process.env.TIMINGS_LEVEL) {
            const t3 = performance.now()
            if (process.env.TIMINGS_LEVEL == 2 || process.env.TIMINGS_LEVEL == 1 && t3 - t2 > timingsLevel1Limit) {
                displayingTimings()
                console.log(`3rd batch (${methods.length} methods):${format_ms(t3 - t2)} ms, block2 = ${block2}, block3 = ${block3}, Hash map: ${hash_map.size}`)
            }
            initTimings()
        }
        // Log everything except sub_versions to shorten the lines
        // const {sub_versions: _, ...rest} = res
        // console.log(JSON.stringify(rest))
        // Even shorter log:
        // console.log(res.time_since_last_block)
        return res
    } catch (err) {
        console.error(err)
        return { err, server_time: Date.now() }
    }
}

// Do my own caching
// Note: the value is memorized in the promise and will be returned immediately when the promise is called again
let cachedPromise = undefined
function getLastRes() {
    // console.log(`Is cached: ${cachedPromise != undefined}`)
    if (cachedPromise == undefined) {
        cachedPromise = loadSummaryCached()
    }
    return cachedPromise
}

export async function loadSummary(refresh) {
    // Fetch last result
    let lastRes = await getLastRes()
    // Reload summary only after REVALIDATE seconds
    const newTime = Date.now()
    const lastTime = lastRes.server_time ?? new Date(0)
    const diffTime = (newTime - lastTime) / 1000
    let hit = diffTime <= process.env.REVALIDATE
    // console.log(`hit: ${hit}, refresh: ${refresh}`)
    if (!hit && refresh) {
        // Invalidate cached result
        cachedPromise = undefined
        // Fetch a new result
        const res = await getLastRes()
        if (res.err == undefined) {
            const lastMempoolNtx = lastRes.mempool != undefined ? lastRes.mempool.ntx : undefined
            const lastNtx = lastRes.ntx
            // Compute transaction rate (added in the mempool)
            // Don't do it after Next js server reboot
            if (lastMempoolNtx != undefined && lastNtx != undefined) {
                // Recompute diffTime from new result
                const diffTime = (res.server_time - lastTime) / 1000
                const ntxPerSecond = (res.mempool.ntx + res.ntx - lastMempoolNtx - lastNtx) / diffTime
                res.mempool.ntx_per_second = precision4(ntxPerSecond)
            }
        }
        if (lastRes.err == undefined) {
            // Don't include last result when it was an error (to avoid complications is frontend when comparing with last result)
            // Note that the frontend already manages an undefined last result (for the very first request after restart)
            res.last_res = lastRes
        }
        lastRes = res
    }
    return lastRes
}

// Cache node version (memorize it once for all at first request after node-summary service restart)
let cachedVersion = undefined

// Call getnetworkinfo RPC endpoints to get node version
export async function getVersion() {
    try {
        if (cachedVersion == undefined) {
            const options = await get_options()
            const rpcResults = await rpcFetch(options, "getnetworkinfo", [])
            const err = rpcResults.error
            if (err != undefined) {
                // Of course, an error isn't cached
                console.error(err)
                return { err }
            }
            cachedVersion = { subversion: rpcResults.result.subversion }
            // console.log(cachedVersion)
        }
        return cachedVersion
    } catch (err) {
        console.error(err)
        return { err }
    }
}

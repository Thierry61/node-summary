// loadSummary function in library is shared between server component and API route

const fs = require('fs/promises')

const difficultyAdjustmentBlockCount = 2016
const targetBlockTimeSeconds = 600
// 24 hours, 6 blocks per hour
const targetBlocksPerDay = 144
// Remark: this isn't a multiple of 2016
const halvingBlockCount = 210000

// Call one specific Bitcoin RPC endpoint
async function rpcFetch(options, method, params) {
    options.body = JSON.stringify({"jsonrpc": "2.0", "id": "info", "method": method, "params": params})
    const rpcResult = await fetch(`${process.env.BITCOIND_HOST}:${process.env.BITCOIND_PORT}`, options)
    if (rpcResult.status != 200)
        throw { method, status: rpcResult.statusText }
    return rpcResult.json()
}

// Function to keep 4 digits of precision (used for number of days, TPS and difficulty adjustments)
function precision4(n) {
    const magnitude = Math.pow(10, Math.floor(Math.log10(n))+1)
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

// Call Bitcoin RPC endpoints to get summary
async function loadSummaryCached() {
    try {
        let options = {
            method: "POST",
            // next: { revalidate: process.env.REVALIDATE }, // doesn't work (I suppose because the request is POST)
            cache: 'no-store',
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

        // Parallel requests to bitcoin RPC server
        const mode = "CONSERVATIVE"
        let methods = [
            {method: "uptime", params: []},
            {method: "getblockchaininfo", params: []},
            {method: "getnettotals", params: []},
            {method: "getpeerinfo", params: []},
            {method: "getblocktemplate", params: [{rules: ["segwit"]}]},
            {method: "getmempoolinfo", params: []},
            {method: "estimatesmartfee", params: [1, mode]},
            {method: "estimatesmartfee", params: [6, mode]},
            {method: "estimatesmartfee", params: [144, mode]},
            {method: "getchaintxstats", params: []},
        ]
        let rpcResults = await Promise.all(methods.map(m => rpcFetch(options, m.method, m.params)))
        let res = {feerates: {}}
        for (let i = 0; i < rpcResults.length; i++) {
            let rpcResult = rpcResults[i]
            const method = methods[i].method
            if (rpcResult.error)
                throw { method, error: rpcResult.error }
            rpcResult = rpcResult.result
            switch (method) {
                case "uptime":
                    res.uptime_days = precision4(rpcResult/(24*3600))
                    break
                case "getblockchaininfo":
                    const diff_epoch = parseInt(Math.floor(rpcResult.headers / difficultyAdjustmentBlockCount)) + 1
                    const halving_epoch = parseInt(Math.floor(rpcResult.headers / halvingBlockCount)) + 1
                    res = {
                        ...res, diff_epoch, halving_epoch, blocks: rpcResult.blocks, headers: rpcResult.headers,
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

        // Second batch of parallel requests (in sequence because they use information generated by first request batch)
        const diffEpochFirstBlockHeight = difficultyAdjustmentBlockCount * (res.diff_epoch - 1)
        const prevDiffEpochLastBlockHeight = diffEpochFirstBlockHeight - 1
        methods = [
            {method: "getblockhash", params: [diffEpochFirstBlockHeight]},
            {method: "getblockhash", params: [prevDiffEpochLastBlockHeight]},
            {method: "getblock", params: [res.bestblockhash]}
        ]
        rpcResults = await Promise.all(methods.map(m => rpcFetch(options, m.method, m.params)))
        for (let i = 0; i < rpcResults.length; i++) {
            let rpcResult = rpcResults[i]
            const method = methods[i].method
            if (rpcResult.error)
                throw { method, error: rpcResult.error }
            rpcResult = rpcResult.result
            switch (method) {
                case "getblock":
                    res.time = rpcResult.time
                    res.server_time = Date.now()
                    res.time_since_last_bloc = Math.round(res.server_time/1000) - rpcResult.time
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

        // Third batch of parallel requests
        methods = [
            {method: "getblock", params: [res.diff_epoch_first_block_hash]},
            {method: "getblock", params: [res.prev_diff_epoch_last_block_hash]}
        ]
        rpcResults = await Promise.all(methods.map(m => rpcFetch(options, m.method, m.params)))
        for (let i = 0; i < rpcResults.length; i++) {
            let rpcResult = rpcResults[i]
            const method = methods[i].method
            if (rpcResult.error)
                throw { method, error: rpcResult.error }
            rpcResult = rpcResult.result
            switch (method) {
                case "getblock":
                    const hash = rpcResult.hash
                    const attributeName = (hash == res.diff_epoch_first_block_hash) ?
                        "diff_epoch_first_block_difficulty" :
                        "prev_diff_epoch_last_block_difficulty"
                    res[attributeName] = rpcResult.difficulty
                    if (hash == res.diff_epoch_first_block_hash)
                        res["diff_epoch_first_block_time"] = rpcResult.time
                    break
                default:
                    // To analyze results of a new method just uncomment following line
                    // console.debug(rpcResult)
            }
        }
        const blocksSinceRetarget = res.headers - diffEpochFirstBlockHeight
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
        const blocksSinceHalving = res.headers - halvingFirstBlockHeight
        // From 210000 to 1
        const blocksToHalving = halvingBlockCount - blocksSinceHalving
        const nextHalvingFirstBlockHeight = halvingBlockCount * res.halving_epoch
        const retargetBeforeNextHalvingHeight = Math.floor(nextHalvingFirstBlockHeight / difficultyAdjustmentBlockCount) * difficultyAdjustmentBlockCount
        const nextRetargetHeight = res.headers + blocksToRetarget
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
        // Log everything except sub_versions to shorten the lines
        // const {sub_versions: _, ...rest} = res
        // console.log(JSON.stringify(rest))
        // Even shorter log:
        // console.log(res.time_since_last_bloc)
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

export async function loadSummary() {
    // Fetch last result
    let lastRes = await getLastRes()
    // Reload summary only after REVALIDATE seconds
    const newTime = Date.now()
    const lastTime = lastRes.server_time ?? new Date(0)
    const diffTime = (newTime - lastTime) / 1000
    let hit = diffTime <= process.env.REVALIDATE
    // console.log(`hit: ${hit}`)
    if (!hit) {
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
        lastRes = res
    }
    return lastRes
}

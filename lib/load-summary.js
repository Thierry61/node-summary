// loadSummary function is shared with getStaticProps and API routes from `lib/` directory
// Inspired from https://nextjs.org/docs/pages/building-your-application/data-fetching/get-static-props#write-server-side-code-directly

const fs = require('fs/promises')

const difficultyAdjustmentBlockCount = 2016
const targetBlockTimeSeconds = 600
const targetBlocksPerDay = 144 // 24 hours, 6 blocks per hour
const halvingBlockCount = 210000

// Call one specific Bitcoin RPC endpoint
async function rpcFetch(options, method, params) {
    options.body = JSON.stringify({"jsonrpc": "2.0", "id": "info", "method": method, "params": params})
    const rpcResult = await fetch(`http://${process.env.BITCOIND_HOST}:${process.env.BITCOIND_PORT}`, options)
    if (rpcResult.status != 200)
        throw { method, status: rpcResult.statusText }
    return rpcResult.json()
}

// Function to keep 3 digits of precision (used for number of days and difficulty adjustments)
function precision3(n) {
    return Math.round(n * 1000) / 1000
}

// Call Bitcoin RPC endpoints to get summary
async function loadSummaryCached() {
    try {
        let userPass = await fs.readFile(process.env.BITCOIND_COOKIE_PATH, { encoding: 'utf8' })
        userPass = userPass.toString().trim()
        const [ username, password ] = userPass.split(':', 2)
        const authorizationHeader = `Basic ${Buffer.from(userPass).toString('base64')}`
        const options = {
            method: "POST",
            username,
            password,
            // next: { revalidate: process.env.REVALIDATE }, // doesn't work (I suppose because the request is POST)
            cache: 'no-store',
            headers: {
                "Authorization": authorizationHeader
            }
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
                    res.uptime_days = precision3(rpcResult/(24*3600))
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
                    const total = rpcResult.length;
                    const ipv4 = rpcResult.filter(i => i.network == "ipv4").length
                    const ipv6 = rpcResult.filter(i => i.network == "ipv6").length
                    const onion = rpcResult.filter(i => i.network == "onion").length
                    const not_publicly_routable = rpcResult.filter(i => i.network == "not_publicly_routable").length
                    res.peers = {total, ipv4, ipv6, onion, not_publicly_routable}
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
                    res.feerates[methods[i].params[0]] = Math.round(rpcResult.feerate * 1E5)
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
                    res.time_since_last_bloc = Math.round(Date.now()/1000) - rpcResult.time
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
        let blockCount = res.headers - diffEpochFirstBlockHeight
        let diffAdjPercent = 0
        if (blockCount != 0) {
            const dt = new Date().getTime() / 1000 - res.diff_epoch_first_block_time;
            const predictedBlockCount = dt / targetBlockTimeSeconds;
            let blockRatioPercent = 100 * (blockCount / predictedBlockCount);
            if (blockRatioPercent > 400) {
                blockRatioPercent = 400;
            }
            if (blockRatioPercent < 25) {
                blockRatioPercent = 25;
            }
            diffAdjPercent = precision3(blockRatioPercent - 100);
        }
        const blocksToRetarget = difficultyAdjustmentBlockCount - blockCount
        const daysToRetarget = precision3(blocksToRetarget/targetBlocksPerDay)
        const halving_epoch_first_block_height = halvingBlockCount * (res.halving_epoch - 1)
        blockCount = res.headers - halving_epoch_first_block_height
        const blocksToHalving = halvingBlockCount - blockCount
        const daysToHalving = precision3(blocksToHalving/targetBlocksPerDay)
        const prevDiffAdj = (res.diff_epoch_first_block_difficulty - res.prev_diff_epoch_last_block_difficulty)
        const prevDiffAdjPercent = precision3(prevDiffAdj / res.prev_diff_epoch_last_block_difficulty * 100)
        res = {
            ...res, prev_diff_adj_percent: prevDiffAdjPercent,
            next_retarget: {blocks: blocksToRetarget, days: daysToRetarget, estimated_diff_adj_percent: diffAdjPercent},
            next_halving: {blocks: blocksToHalving, days: daysToHalving}
        }
        delete res.bestblockhash
        delete res.diff_epoch_first_block_hash
        delete res.diff_epoch_first_block_time
        delete res.diff_epoch_first_block_difficulty
        delete res.prev_diff_epoch_last_block_hash
        delete res.prev_diff_epoch_last_block_difficulty
        res.revalidate=process.env.REVALIDATE
        return res
    } catch (err) {
        console.error(err)
        return { err }
      }
  }

// Do my own caching (I couldn't make the react cache work)
let lastRes = {}
let lastTime;
// Compute transaction rate (added in the mempool)
let lastMempoolNtx;
let lastExactTime;
let lastHeaders;
export async function loadSummary() {
    const newExactTime = Date.now()
    const newTime = Math.floor(newExactTime / 1000 / process.env.REVALIDATE)
    let hit = lastTime == newTime;
    if (!hit) {
        lastRes = await loadSummaryCached()
        // Don't compute rate after server reboot, or when previous request was at a different block height
        if (lastMempoolNtx != undefined && lastHeaders == lastRes.headers) {
            const ntxPerSeconds = (lastRes.mempool.ntx - lastMempoolNtx) / (newExactTime - lastExactTime) * 1000
            lastRes.mempool.ntx_per_second = precision3(ntxPerSeconds)
        }
        lastMempoolNtx = lastRes.mempool.ntx
        lastHeaders = lastRes.headers
        lastTime = newTime
        lastExactTime = newExactTime
    }
    return lastRes
}

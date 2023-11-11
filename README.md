This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

The Web App displays summary information about a Bitcoin Core node. It exclusively uses the bitcoin RPC API to get this information.

The app has one web page (/) and one main API entry point (/api/summary). The web page is automatically refreshed every 5 secondes. The refresh rate can be changed with REVALIDATE parameter in .env file. To not burden the bitcoin RPC, the API is cached and REVALIDATE parameter is also the API cache duration. There is also a health check API entry point (/api/health) that returns either 200 OK or 503 Service Unavailable.

The information is divided in a set of cards spread on a grid. The grid uses Tailwind breakpoint prefixes and grid template columns so that the layout is responsive to the dynamic screen size and orientation.

Note: Any mention of 192.168.110.121 throughout the document should be replaced by your own address of deployment.

## Development

Adapt .env file at the root:
  - set REVALIDATE to the desired refresh rate value (in seconds)
  - set BITCOIND_HOST to your bitcoin RPC host (including the scheme)
  - set BITCOIND_PORT to your bitcoin RPC port
  - use one of 3 authentication methods:
    - define BITCOIND_COOKIE_PATH to point to your bitcoin node `.cookie` file (when server is run directly on the same machine as the node)
    - set BITCOIND_USERNAME and BITCOIND_PASSWORD environment variables
    - don't set any of BITCOIND_COOKIE_PATH, BITCOIND_USERNAME and BITCOIND_PASSWORD environment variables for an unauthenticated server (like https://bitcoin-mainnet-archive.allthatnode.com:443 for example)

Install the dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) with your browser to see the result. To display formatted json API result run `curl localhost:3003/api/summary | jq -r '.'`

## Deployment

If configuration is different from development, then create a `.env.production.local` file to adapt environment variables. If this file contains secrets don't publish it to GitHub (default NextJS generated configuration exclude it in .gitignore file). Example of such a file:
```ini
# New environment variables
BITCOIND_USERNAME="<redacted>"
BITCOIND_PASSWORD="<redacted>"
# Erase BITCOIND_COOKIE_PATH defined in .env file
BITCOIND_COOKIE_PATH=
# Overwrite BITCOIND_HOST defined in .env file
BITCOIND_HOST="http://192.168.110.121"
```

Build the web app with:
```bash
npm run build
```

Redefine `-H` option in `start` command of package.json to correspond to NextJS app exposed address. This address can be different from bitcoind host.

Allow 3003 port in your firewall. For UFW the command is `sudo ufw allow from 192.168.110.0/24 to any port 3003 proto tcp` (this is my VPN cidr)

Run the server with:
```bash
npm run start
```

Note that in both development and deployment cases the port used is the same (3003) but it's OK to run them in parallel on the same machine because they are defined on different interfaces (respectively, localhost and 192.168.110.121).

## Automatic launch with systemctl

Stop any interactive `npm run start` session.

Create `/etc/systemd/system/node-summary.service` file with following content (replace working directory, npm path, user, group by your own):
```ini
[Unit]
Description=BTC RPC Summary
After=bitcoind.service

[Service]
WorkingDirectory=/home/ubuntu0/Documents/node-summary/
# We need both setting the path (for node) and prefixing executed program (for npm)
ExecStart=bash -c "PATH=/home/ubuntu0/.nvm/versions/node/v18.14.2/bin:$PATH /home/ubuntu0/.nvm/versions/node/v18.14.2/bin/npm start"
User=ubuntu0
Group=ubuntu0
Type=simple
KillMode=control-group
TimeoutSec=60
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

Launch web app with:
```
sudo systemctl enable node-summary
sudo systemctl start node-summary
```

Access from browser by navigating to http://192.168.110.121:3003 or call API with `curl http://192.168.110.121:3003/api/summary | jq -r '.'`

Get the logs with: `journalctl -S <hh:mm> -u node-summary -o cat -f`

## Examples

### Web App screen shot

![](./screen-shot.png)

### API result

```json
{
  "feerates": {
    "1": 242.604,
    "6": 220.123,
    "144": 11.924
  },
  "uptime_days": 7.76,
  "diff_epoch": 405,
  "halving_epoch": 4,
  "blocks": 816327,
  "headers": 816327,
  "size_on_disk": 596229529914,
  "totalbytesrecv": 8004102468,
  "totalbytessent": 881873911445,
  "peers": {
    "total": 124,
    "ipv4": {
      "in": 63,
      "out": 4
    },
    "ipv6": {
      "in": 21,
      "out": 0
    },
    "onion": {
      "in": 29,
      "out": 6
    },
    "not_publicly_routable": {
      "in": 1,
      "out": 0
    }
  },
  "sub_versions": [
    [ "/Satoshi:25.0.0/", 21 ],
    [ "/btcwire:0.5.0/Satoshi:25.0.0/", 16 ],
    [ "/Satoshi:24.0.1/", 15 ],
    [ "/Satoshi:25.1.0/", 14 ],
    [ "/Satoshi:23.0.0/", 8 ],
    [ "/dsn.tm.kit.edu/bitcoin:0.9.99/", 5 ],
    [ "/Satoshi:22.0.0/", 5 ],
    [ "/Satoshi:25.99.0/", 3 ],
    [ "/bitnodes.io:0.3/", 2 ],
    [ "/Satoshi:22.0.0(FutureBit-Apollo-Node)/", 2 ],
    [ "/Satoshi:26.99.0/", 2 ],
    [ "/bitnodes.earn.com:0.1/", 2 ],
    [ "/Satoshi:0.20.1/", 2 ],
    [ "/Satoshi:0.16.0/", 2 ],
    [ "/nodes.mom.market:0.2/", 2 ],
    [ "/electrs:0.10.0/", 1 ],
    [ "/seeder:0.0001/", 1 ],
    [ "/Satoshi:0.14.0/", 1 ],
    [ "", 1 ],
    [ "/Satoshi:23.1.0/", 1 ],
    [ "/Satoshi:24.1.0/", 1 ],
    [ "/Satoshi:24.0.0/", 1 ],
    [ "/Satoshi:0.19.0.1/", 1 ],
    [ "/btcwire:0.5.0/bitcoinstats.com:0.2/", 1 ],
    [ "/Satoshi:0.16.1/", 1 ],
    [ "/Satoshi:0.18.0/", 1 ],
    [ "/bitcoinj:0.16.1/", 1 ],
    [ "/Satoshi:25.0.0(RoninDojo 2.1.0)/", 1 ],
    [ "/breadwallet:1.50/", 1 ],
    [ "/Satoshi:0.7.0.3/", 1 ],
    [ "/breadwallet:1.4/", 1 ],
    [ "/BitCoinJ:0.11.2/MultiBit:0.5.18/", 1 ],
    [ "/bitcoinj:0.14.3/Bitcoin Wallet:4.58.1-btcx/", 1 ],
    [ "/bitcoinj:0.14.5/Bitcoin Wallet:5.42/", 1 ],
    [ "/breadwallet:0.6.5/", 1 ],
    [ "/breadwallet:1.3.5/", 1 ],
    [ "/Satoshi:0.12.0/", 1 ],
    [ "/bitcoinj:0.14.4/Bitcoin Wallet:5.22/", 1 ]
  ],
  "template": {
    "fees": 2.17614741,
    "ntx": 4035
  },
  "mempool": {
    "fees": 14.11043283,
    "ntx": 100548,
    "ntx_per_second": 4.911
  },
  "ntx": 917660966,
  "ntx_per_second": 4.875,
  "server_time": 1699722563156,
  "time_since_last_bloc": 515,
  "prev_diff_adj_percent": 2.348,
  "next_retarget": {
    "blocks": 153,
    "days": 1.03,
    "estimated_diff_adj_percent": 3.114
  },
  "next_halving": {
    "blocks": 23673,
    "retargets": 12,
    "days": 164.4
  },
  "revalidate": "5"
}
```

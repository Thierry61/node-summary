This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

The Web App displays summary information about a Bitcoin Core node. It must be run directly on the same machine as the node and the node must be accessible with credentials in `.cookie` file.

The app has one web page (/) and one API entry point (/api/summary). The web page is automatically refreshed every 5 secondes. The refresh rate can be changed with REVALIDATE parameter in .env file. To not burden the bitcoin RPC, the API is cached and REVALIDATE parameter is also the API cache duration.

As there is no interactivity, the web page is still operational when javascript is disabled, including automatic refresh which is managed by http-equiv="refresh" meta tag.

Note: Any mention of 192.168.110.121 throughout the document should be replaced by your own address of deployment.

## Development

Adapt .env file at the root:
  - redefine BITCOIND_COOKIE_PATH to point to your bitcoin node `.cookie` file
  - set BITCOIND_PORT to your bitcoin RPC port.

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

Build the web app with:
```bash
npm run build
```

Redefine `-H` option in `start` command of package.json to correspond to your exposed address (mine is `192.168.110.121` in my WireGuard VPN).

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
    "1": 83,
    "6": 46,
    "144": 20
  },
  "uptime_days": 30.512,
  "diff_epoch": 393,
  "halving_epoch": 4,
  "blocks": 791610,
  "headers": 791610,
  "size_on_disk": 549036107585,
  "totalbytesrecv": 26138792282,
  "totalbytessent": 172915725919,
  "peers": {
    "total": 64,
    "ipv4": 10,
    "ipv6": 0,
    "onion": 53,
    "not_publicly_routable": 1
  },
  "template": {
    "fees": 0.31639836,
    "ntx": 4350
  },
  "mempool": {
    "fees": 15.15287524,
    "ntx": 64817,
    "ntx_per_second": 3.238
  },
  "time_since_last_bloc": 394,
  "prev_diff_adj_percent": 3.217,
  "next_retarget": {
    "blocks": 678,
    "days": 4.708,
    "estimated_diff_adj_percent": 1.01
  },
  "next_halving": {
    "blocks": 48390,
    "days": 336.042
  },
  "revalidate": "5"
}
```





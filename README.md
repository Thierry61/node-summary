This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

The Web App displays summary information about a Bitcoin Core node. It must be run directly on the same machine as the node and the node must be accessible with credentials in `.cookie` file.

The app has one web page (/) and one API entry point (/api/summary). The web page is automatically refreshed every 5 secondes. The refresh rate can be changed with REVALIDATE parameter in .env file. To not burden the bitcoin RPC, the API is cached and REVALIDATE parameter is also the API cache duration.

As there is no interactivity, the web page is still operational when javascript is disabled, including automatic refresh which is managed by http-equiv="refresh" meta tag.

Note: Any mention of 192.168.110.121 throughout the document should be replaced by your own address of deployment.

## Development

First, adapt .env file at the root:
- redefine BITCOIND_COOKIE_PATH to point to your bitcoin node `.cookie` file
- set BITCOIND_PORT to your bitcoin RPC port.

Then, run the development server:
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

Create `/etc/systemd/system/node-summary.service` file with following content (replace working directory and npm path by your own):
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
    "1": 111,
    "6": 79,
    "144": 19
  },
  "uptime_days": 23.785,
  "diff_epoch": 393,
  "halving_epoch": 4,
  "blocks": 790604,
  "headers": 790604,
  "size_on_disk": 547057274650,
  "totalbytesrecv": 19716881205,
  "totalbytessent": 137218902796,
  "peers": {
    "total": 66,
    "ipv4": 8,
    "ipv6": 0,
    "onion": 57,
    "not_publicly_routable": 1
  },
  "template": {
    "fees": 0.63807639,
    "ntx": 2201
  },
  "mempool": {
    "fees": 14.07626074,
    "ntx": 69342
  },
  "time_since_last_bloc": 258,
  "prev_diff_adj_percent": 3.217,
  "next_retarget": {
    "blocks": 1684,
    "days": 11.694,
    "estimated_diff_adj_percent": -6.732
  },
  "next_halving": {
    "blocks": 49396,
    "days": 343.028
  },
  "revalidate": "5"
}
```





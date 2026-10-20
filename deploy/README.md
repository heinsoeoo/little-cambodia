# Production deployment

Live: https://little-cambodia.hexdock.dev
Repository: https://github.com/heinsoeoo/little-cambodia (private)
Server: 149.28.153.104, Ubuntu 24.04, 1 GB RAM
Initial guest cap: 16 simultaneous guests; this is a configured cap, not a load-tested capacity guarantee.

## Runtime

Node 22 from official nodejs.org binary distribution, checksum verified. nginx serves HTTPS and proxies to Node at 127.0.0.1:5173. systemd runs the game as unprivileged littlecambodia and restarts failures. Certbot handles certificate renewal. UFW permits SSH, HTTP and HTTPS; Node is not public.

Game sessions are in memory and reset on restart/deployment. No database is used. Releases live in /opt/littlecambodia/releases and /opt/littlecambodia/current is an atomic symlink. Deployment rolls back the symlink if the local health check fails. Old releases are kept for manual rollback; monitor disk use.

## GitHub Actions

The workflow tests pull requests and main, checks formatting, builds with Node 22, and deploys only successful main builds. Main deployments are serialized. Official actions are pinned to commit SHAs. The approved Actions secret DEPLOY_SSH_KEY is configured with the dedicated littlecambodia_actions private key. Never commit it. SSH host key is pinned in deploy/known_hosts.

The CI key connects as littlecambodia-deploy, with a forced receiver command and no forwarding or PTY. The user may upload game releases and restart only littlecambodia.service through a specific sudoers rule; it has no root SSH access. The receiver validates commit IDs, serializes deploys and limits uploads to 50 MB. Source maintainers who can change production workflows/code can deploy game code; protect main appropriately as collaborators are added.

Local administration uses ~/.ssh/littlecambodia_deploy as root. CI uses a separate ~/.ssh/littlecambodia_actions key. Keys are outside the repository.

## Checks and operations

curl -fsS https://little-cambodia.hexdock.dev/healthz
systemctl status littlecambodia
journalctl -u littlecambodia -n 100
certbot renew --dry-run

To roll back manually, replace current with a symlink to a known healthy release then restart littlecambodia.service. Use root to manage service/proxy configuration; CI intentionally cannot change those files. Bootstrap/install-release scripts document the initial server setup; do not blindly rerun them over existing production configuration.

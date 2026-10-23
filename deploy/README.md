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

## Nearby voice

Audio-only WebRTC is opt-in through the small mic button on the main game screen. Both players must enable voice. Server-authoritative proximity permits signaling within 40 m; clients fade voices between 5 m and 40 m and close peer connections when out of range. Turning voice off, leaving, disconnecting, or hiding the page stops microphone tracks and incoming audio. No recording is implemented. Media travels directly between players where possible, with coturn as fallback. At most 15 peers are possible within the existing 16-guest cap.

Production uses Ubuntu coturn on the same host. `setup-voice-relay.sh 149.28.153.104` documents the root-only setup after `apt-get install coturn`; do not rerun against an unrelated relay. The secret stays in `/etc/littlecambodia/voice.env` and `/etc/turnserver.conf`, outside Git and release archives. The app gets its environment through a systemd drop-in and issues time-limited HMAC credentials only to joined guests enabling voice. UDP/TCP 3478 and UDP 49160–49415 are allowed in UFW. A Vultr firewall, if added separately, must allow the same ports. Relay allocation quotas and private-network peer restrictions are configured. Voice traffic consumes the existing server transfer allowance. Local development falls back to STUN without relay environment variables.

Verify `systemctl is-active coturn`, then test two devices using different networks, both with the mic enabled: voice nearby, gradual fade on separation, silence beyond 40 m, and immediate stop with mic off. A browser permission denial leaves voice off. In-app Facebook browsers may require opening Safari or Chrome.

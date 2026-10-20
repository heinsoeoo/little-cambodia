# Little Cambodia deployment

Target: root@149.28.153.104
Domain: littlecambodia.hexdock.dev
Local SSH key: ~/.ssh/littlecambodia_deploy (private; never upload)

## Pending access

Authorize ~/.ssh/littlecambodia_deploy.pub in /root/.ssh/authorized_keys through the Vultr web console or an existing trusted root session. Add a DNS A record for littlecambodia.hexdock.dev pointing to 149.28.153.104. As checked during preparation, DNS returns NXDOMAIN and the server rejects the new key.

## Deployment plan after access

1. Inspect OS, existing services, disk, memory, Node and firewall before making changes.
2. Install a supported Node.js 22+ runtime if absent. Build locally and upload the release archive; install production dependencies on the server.
3. Create an unprivileged littlecambodia service user and /opt/littlecambodia/releases/<release>. Point /opt/littlecambodia/current to the verified release. Keep the previous release for rollback.
4. Install littlecambodia.service with the correct Node executable path. Keep Node bound to 127.0.0.1:5173. Restart automatically with systemd.
5. Add the nginx site config without disturbing other sites. Validate nginx configuration before reloading.
6. Issue an HTTPS certificate after DNS resolves. The .dev domain requires HTTPS in browsers. Verify renewal and HTTPS redirects. Allow public HTTP/HTTPS in the provider firewall if needed; preserve SSH access and all unrelated firewall rules.
7. Verify the game loads and a same-origin secure WebSocket guest can join, summon and disconnect. Confirm the existing 16-guest cap. Do not promise higher capacity without load testing.

The archive contains the production build, server, shared source modules and dependency lockfile. It excludes private SSH material, node_modules and Git history. No database is currently required. Restarting the service resets active guest sessions.

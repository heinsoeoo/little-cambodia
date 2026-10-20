#!/usr/bin/env bash
set -euo pipefail
release_id=${1:?Release identifier required}
[[ "$release_id" =~ ^[a-zA-Z0-9-]{1,64}$ ]] || exit 2
release=/opt/littlecambodia/releases/$release_id
mkdir "$release"
tar -xzf /opt/littlecambodia/incoming.tar.gz -C "$release"
cd "$release"
/usr/local/bin/npm ci --omit=dev --ignore-scripts --no-audit --no-fund
chown -R root:littlecambodia "$release"
chmod -R g+rX,o-rwx "$release"
previous=$(readlink /opt/littlecambodia/current || true)
ln -s "$release" /opt/littlecambodia/next
mv -Tf /opt/littlecambodia/next /opt/littlecambodia/current
systemctl restart littlecambodia
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:5173/healthz >/dev/null; then
    printf 'Release %s is healthy\n' "$release_id"
    exit 0
  fi
  sleep 1
done
if [ -n "$previous" ]; then
  ln -s "$previous" /opt/littlecambodia/rollback
  mv -Tf /opt/littlecambodia/rollback /opt/littlecambodia/current
  systemctl restart littlecambodia
fi
printf 'Release failed its health check\n' >&2
exit 1

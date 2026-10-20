#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([a-f0-9]{40})$ ]]; then
  release_id=${BASH_REMATCH[1]}
else
  echo 'Only deployment of a commit SHA is allowed.' >&2
  exit 2
fi
exec 9>/opt/littlecambodia/.deploy-lock
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
release=/opt/littlecambodia/releases/$release_id
if [ -e "$release" ]; then
  cat >/dev/null
  [ "$(readlink /opt/littlecambodia/current)" = "$release" ] && curl -fsS http://127.0.0.1:5173/healthz && exit 0
  echo 'Release already exists but is not current.' >&2
  exit 1
fi
archive=$(mktemp /opt/littlecambodia/upload.XXXXXX)
trap 'rm -f "$archive"' EXIT
head -c 52428801 > "$archive"
[ "$(stat -c %s "$archive")" -le 52428800 ] || { echo 'Archive too large.' >&2; exit 1; }
mkdir "$release"
tar -xzf "$archive" --no-same-owner --no-same-permissions -C "$release"
cd "$release"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
chgrp -R littlecambodia "$release"
chmod -R g+rX,o-rwx "$release"
previous=$(readlink /opt/littlecambodia/current || true)
ln -s "$release" /opt/littlecambodia/next
mv -Tf /opt/littlecambodia/next /opt/littlecambodia/current
sudo /usr/bin/systemctl restart littlecambodia.service
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:5173/healthz >/dev/null; then
    echo "Deployed $release_id"
    exit 0
  fi
  sleep 1
done
if [ -n "$previous" ]; then
  ln -s "$previous" /opt/littlecambodia/rollback
  mv -Tf /opt/littlecambodia/rollback /opt/littlecambodia/current
  sudo /usr/bin/systemctl restart littlecambodia.service
fi
echo 'Health check failed; rolled back.' >&2
exit 1

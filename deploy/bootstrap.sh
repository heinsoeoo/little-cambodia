#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx xz-utils
mkdir -p /opt/littlecambodia
if ! command -v node >/dev/null || [ "$(node -p 'parseInt(process.versions.node)')" -lt 22 ]; then
  runtime_dir=$(mktemp -d)
  cd "$runtime_dir"
  curl -fsSLO https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt
  runtime_file=$(awk '$2 ~ /^node-v22\..*-linux-x64.tar.xz$/ {print $2}' SHASUMS256.txt)
  test -n "$runtime_file"
  curl -fsSLO "https://nodejs.org/dist/latest-v22.x/$runtime_file"
  awk -v file="$runtime_file" '$2 == file' SHASUMS256.txt | sha256sum -c -
  tar -xJf "$runtime_file" -C /usr/local --strip-components=1
fi
id littlecambodia >/dev/null 2>&1 || useradd --system --home-dir /opt/littlecambodia --shell /usr/sbin/nologin littlecambodia
mkdir -p /opt/littlecambodia/releases
node --version
nginx -t
ufw allow 80/tcp
ufw allow 443/tcp

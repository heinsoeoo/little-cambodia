#!/usr/bin/env bash
# Run once as root on the existing game host, after installing Ubuntu's coturn package.
set -euo pipefail
[[ $(id -u) == 0 ]] || exit 1
voice_host=${1:?Public relay IP or hostname required}
[[ "$voice_host" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 2
install -d -m 700 /etc/littlecambodia
if [[ ! -f /etc/littlecambodia/voice.env ]]; then
  umask 077
  voice_secret=$(openssl rand -hex 32)
  printf 'VOICE_TURN_HOST=%s\nVOICE_TURN_SECRET=%s\n' "$voice_host" "$voice_secret" > /etc/littlecambodia/voice.env
fi
source /etc/littlecambodia/voice.env
umask 077
cat > /etc/turnserver.conf <<CONFIG
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=$VOICE_TURN_SECRET
realm=little-cambodia.hexdock.dev
min-port=49160
max-port=49415
user-quota=16
total-quota=256
max-bps=160000
bps-capacity=12000000
stale-nonce=600
no-cli
no-tls
no-dtls
no-tcp-relay
no-multicast-peers
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
log-file=syslog
simple-log
CONFIG
chown root:turnserver /etc/turnserver.conf
chmod 640 /etc/turnserver.conf
install -d /etc/systemd/system/littlecambodia.service.d
printf '[Service]\nEnvironmentFile=/etc/littlecambodia/voice.env\n' > /etc/systemd/system/littlecambodia.service.d/voice.conf
ufw allow 3478/tcp comment 'Game voice relay'
ufw allow 3478/udp comment 'Game voice discovery and relay'
ufw allow 49160:49415/udp comment 'Game voice media'
systemctl daemon-reload
systemctl enable coturn
systemctl restart coturn
systemctl is-active coturn

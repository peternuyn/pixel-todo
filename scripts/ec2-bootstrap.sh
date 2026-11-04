#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# EC2 bootstrap: turns a fresh instance into a box ready to run this app.
#
# Paste this whole file into "Advanced details > User data" when launching the
# instance (it runs once, as root, on first boot), or run it by hand:
#   sudo bash scripts/ec2-bootstrap.sh
#
# Works on Amazon Linux 2023 and Ubuntu 22.04/24.04. It:
#   1. installs Docker + the compose plugin + git,
#   2. adds a 2G swap file (small instances OOM without it),
#   3. clones the repo into the default user's home folder.
# Secrets (.env), the GHCR login and the SSL cert are still manual — see DEPLOY.md.
#
# Progress log on the box: /var/log/cloud-init-output.log
# ---------------------------------------------------------------------------
set -euxo pipefail

REPO_URL="https://github.com/peternuyn/pixel-todo.git"
APP_NAME="pixel-todo"

# ---- Detect distro and default user ----
. /etc/os-release
if [ "$ID" = "ubuntu" ]; then
  APP_USER="ubuntu"
  apt-get update -y
  apt-get install -y git curl
  # Docker's convenience script installs the engine AND the compose plugin.
  curl -fsSL https://get.docker.com | sh
else
  APP_USER="ec2-user"
  dnf install -y docker git
  # Amazon Linux doesn't package the compose plugin; install the binary.
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

systemctl enable --now docker
# Let the ssh user (and so the CI deploy job) run docker without sudo.
usermod -aG docker "$APP_USER"

# ---- Swap (skip if one already exists) ----
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---- Clone the repo ----
APP_DIR="/home/$APP_USER/$APP_NAME"
if [ ! -d "$APP_DIR/.git" ]; then
  # If the repo is private this fails; clone by hand afterwards (see DEPLOY.md).
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR" || echo "!!! git clone failed — clone manually"
fi

echo "### Bootstrap done. App dir: $APP_DIR"

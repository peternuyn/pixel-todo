# Recreating the EC2 backend from scratch

Everything app-level lives in this repo (`docker-compose.yml`, `nginx/`, `scripts/`,
CI in `.github/workflows/ci.yml`). Only the instance itself, `.env`, and the SSL cert
need recreating. The database starts empty unless you restore a backup (step 7).

## 1. Launch the instance (AWS console)

- **AMI:** Amazon Linux 2023 or Ubuntu 24.04
- **Type:** t3.small or larger (t3.micro works because of the swap file, but it's slow)
- **Key pair:** create or reuse one; keep the `.pem`, since CI needs it too
- **Security group inbound:** 22 (SSH), 80 (HTTP), 443 (HTTPS) from `0.0.0.0/0`
- **Storage:** 20 GB gp3
- **Advanced details → User data:** paste the contents of [scripts/ec2-bootstrap.sh](scripts/ec2-bootstrap.sh)

> Tip: after the first launch, use **Actions → Image and templates → Create template
> from instance** to save all of the above as a Launch Template. Next time:
> *Launch instance from template*, and steps 1–2 are done in one click.

Optionally give it an **Elastic IP** so the IP (and the DNS/secrets below) stay fixed
even if you stop/start the instance.

## 2. Wait for the bootstrap

```bash
ssh -i ~/Documents/keys/vietthanh-mac.pem ubuntu@46.137.242.23
       # Ubuntu: ubuntu@<IP>
tail -f /var/log/cloud-init-output.log # wait for "### Bootstrap done"
```

Log out and back in once so the `docker` group membership takes effect.
If the repo is private and the clone failed:
`git clone https://<user>:<PAT>@github.com/peternuyn/pixel-todo.git ~/pixel-todo`

## 3. Secrets

```bash
cd ~/pixel-todo
cp .env.example .env && nano .env      # real DB password, CORS origin, Gemini key
```

## 4. Point DNS at the new IP

Update the A record for the backend domain to the new public IP. (Or use
`<IP>.sslip.io` as the domain with no DNS setup.) Also update the frontend's
`NEXT_PUBLIC_API_URL` on Vercel if the domain changed.

## 5. Start the stack + SSL

```bash
# Only needed if the GHCR image is private (PAT with read:packages):
echo <PAT> | docker login ghcr.io -u peternuyn --password-stdin

docker compose pull
DOMAIN=api.example.com EMAIL=you@example.com ./scripts/init-letsencrypt.sh
docker compose up -d
```

Check: `curl https://<DOMAIN>/api/...` or `docker compose logs -f backend`.

## 6. Re-wire CI auto-deploy

GitHub repo → Settings → Secrets and variables → Actions, update:

| Secret        | Value                                                       |
|---------------|-------------------------------------------------------------|
| `EC2_HOST`    | new public IP / DNS                                         |
| `EC2_USER`    | `ec2-user` (Amazon Linux) or `ubuntu`                        |
| `EC2_SSH_KEY` | full contents of the `.pem` (only if you made a new key)     |
| `EC2_APP_DIR` | `/home/ec2-user/pixel-todo` (or `/home/ubuntu/pixel-todo`)   |

Push to `main` (or re-run the last workflow) to confirm the deploy job succeeds.

## 7. Database backups (do this so the next rebuild isn't empty)

```bash
# Backup (run on the box, copy the file off it)
docker exec leaf-and-bound-postgres pg_dump -U studyfarm -d studyfarm -Fc > backup.dump
scp -i key.pem ec2-user@<IP>:~/pixel-todo/backup.dump .

# Restore onto a fresh box (after step 5)
docker exec -i leaf-and-bound-postgres pg_restore -U studyfarm -d studyfarm --clean --if-exists < backup.dump
```

## Handy

```bash
docker exec -it leaf-and-bound-postgres psql -U studyfarm -d studyfarm
docker compose ps
docker compose logs -f backend
```

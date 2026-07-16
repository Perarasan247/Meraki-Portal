# Deploy Meraki Portal to a Hostinger VPS

One Ubuntu VPS runs everything: **nginx** serves the built React app and
reverse-proxies `/api` to **uvicorn** (FastAPI). Supabase stays as the managed
database + auth. Same origin, so **no CORS to configure**.

```
merakiailabs.com  ──►  nginx :443
                         ├── /       → /var/www/meraki/frontend/dist (React)
                         └── /api/   → 127.0.0.1:8000 (uvicorn, systemd)
                                          └──► Supabase (DB + Auth)
```

Config files referenced below live in [`deploy/`](deploy/).

---

## 0. Connect
Get the VPS IP + root password from hPanel → VPS. Then:
```bash
ssh root@YOUR_VPS_IP
```

## 1. Remove the existing dummy site
First see what's currently serving port 80:
```bash
sudo ss -ltnp | grep ':80' || true
```

**If a control panel is installed** (CyberPanel, aaPanel, Webmin, Plesk…): the
cleanest path is to reinstall the VPS with a **plain Ubuntu 24.04** template from
hPanel → VPS → Operating System, then start fresh. A panel will fight nginx.

**If it's a plain server** with Apache or a default nginx page, disable it:
```bash
# If Apache is serving the dummy page, stop it so nginx can own port 80:
sudo systemctl disable --now apache2 2>/dev/null || true

# Remove any existing web root / default site content:
sudo rm -rf /var/www/html/*
```

## 2. Install what we need
```bash
adduser meraki && usermod -aG sudo meraki      # a non-root user to run the app
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
```

## 3. Get the code
```bash
sudo mkdir -p /var/www/meraki && sudo chown -R meraki:meraki /var/www/meraki
su - meraki
git clone YOUR_REPO_URL /var/www/meraki
cd /var/www/meraki
```

## 4. Backend
```bash
python3 -m venv /var/www/meraki/.venv
/var/www/meraki/.venv/bin/pip install -r backend/requirements.txt

cp deploy/backend.env.example backend/.env
nano backend/.env            # fill in the real Supabase keys
chmod 600 backend/.env

# Run the API as a service:
sudo cp deploy/meraki-api.service /etc/systemd/system/meraki-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now meraki-api
sudo systemctl status meraki-api          # active (running)
curl -fsS http://127.0.0.1:8000/api/health && echo   # -> ok
```

## 5. Frontend
```bash
cd /var/www/meraki/frontend
cp ../deploy/frontend.env.production.example .env.production.local
nano .env.production.local     # fill in Supabase URL + anon key (VITE_API_BASE_URL stays /api)

npm ci
npm run build                  # outputs frontend/dist
```
> On a 1 GB VPS the build can run out of memory. Add swap once:
> `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`

## 6. nginx
```bash
sudo cp /var/www/meraki/deploy/nginx-meraki.conf /etc/nginx/sites-available/meraki
sudo ln -s /etc/nginx/sites-available/meraki /etc/nginx/sites-enabled/meraki
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
Point DNS (Hostinger → Domains → DNS Zone) so both records hit the VPS IP:
```
@     A   YOUR_VPS_IP
www   A   YOUR_VPS_IP
```
Visit `http://merakiailabs.com` — the site should load.

## 7. HTTPS (free, auto-renewing)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d merakiailabs.com -d www.merakiailabs.com
# choose "redirect HTTP -> HTTPS"
sudo certbot renew --dry-run     # confirm auto-renewal works
```

## 8. Supabase production config
Supabase dashboard → **Authentication → URL Configuration**:
- Site URL: `https://merakiailabs.com`
- Redirect URLs: add `https://merakiailabs.com/**`  (needed for password-reset links)

Confirm all SQL migrations in `supabase/migrations/` have been run.

## 9. Done — future updates
```bash
cd /var/www/meraki && ./deploy/deploy.sh
```

---

## Operating notes
- **Logs:** `sudo journalctl -u meraki-api -f`
- **Restart API:** `sudo systemctl restart meraki-api`
- **Secrets** (`backend/.env`) live only on the server, `chmod 600`, never in git.
- **You** own OS patching (`sudo apt upgrade`), uptime monitoring, and firewall.
  The VPS holds no data — Supabase does — so a rebuild is just re-running this guide.
- **Backups:** enable Supabase Pro for daily DB backups once you have real data.

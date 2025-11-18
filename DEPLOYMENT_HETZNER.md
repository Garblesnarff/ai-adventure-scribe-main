# Deployment Guide - Hetzner VPS

This guide walks you through deploying the AI Adventure Scribe application to a Hetzner VPS using Docker Compose.

## Prerequisites

- A Hetzner VPS (Cloud Server) running Ubuntu 22.04 or later
- Root or sudo access to the server
- A domain name pointing to your VPS (optional but recommended)
- Basic familiarity with SSH and Linux commands

### Recommended Hetzner VPS Specs

**Minimum (Testing/Development):**
- CPX21: 3 vCPU, 4 GB RAM, 80 GB SSD
- €7.69/month

**Recommended (Production):**
- CPX31: 4 vCPU, 8 GB RAM, 160 GB SSD
- €13.90/month

**Scaling (High Traffic):**
- CPX41: 8 vCPU, 16 GB RAM, 240 GB SSD
- €26.90/month

---

## Step 1: Provision Hetzner VPS

1. Log in to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Create a new project or select an existing one
3. Click **Add Server**
4. Select:
   - **Location**: Choose closest to your users
   - **Image**: Ubuntu 22.04
   - **Type**: CPX21 or higher (see specs above)
   - **SSH Key**: Add your public SSH key
5. Click **Create & Buy Now**
6. Note your server's IP address

---

## Step 2: Initial Server Setup

### 2.1 Connect to Your Server

```bash
ssh root@<YOUR_SERVER_IP>
```

### 2.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 2.3 Install Docker

```bash
# Install dependencies
apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2.4 Configure Firewall (UFW)

```bash
# Install UFW if not present
apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application ports
ufw allow 3000/tcp  # Frontend
ufw allow 8000/tcp  # CrewAI Service
ufw allow 8001/tcp  # Supabase Kong Gateway

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Step 3: Deploy the Application

### 3.1 Create Application Directory

```bash
mkdir -p /opt/ai-adventure-scribe
cd /opt/ai-adventure-scribe
```

### 3.2 Transfer Code to Server

**Option A: Using rsync (Recommended)**

From your local machine:

```bash
rsync -avz --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '__pycache__' \
  /path/to/ai-adventure-scribe/ \
  root@<YOUR_SERVER_IP>:/opt/ai-adventure-scribe/
```

**Option B: Using Git Clone**

On the server:

```bash
cd /opt/ai-adventure-scribe
git clone <YOUR_REPOSITORY_URL> .
```

### 3.3 Create Environment Configuration

Create a `.env` file based on the example:

```bash
cp .env.production.example .env
nano .env
```

**Configure the following critical variables:**

```bash
# Database Password (CHANGE THIS!)
POSTGRES_PASSWORD=your-super-secure-postgres-password-here

# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long

# Supabase Keys (Generate with Supabase CLI or JWT generator)
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# Realtime Secret (Generate with: openssl rand -base64 32)
REALTIME_SECRET_KEY_BASE=your-realtime-secret-key-base-here

# Public URLs (Replace with your domain or IP)
API_EXTERNAL_URL=http://your-domain.com:8001
SITE_URL=http://your-domain.com:3000

# SMTP Configuration (for user emails)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_ADMIN_EMAIL=admin@example.com

# AI API Keys
OPENROUTER_API_KEY=your-openrouter-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**Generate Secure Secrets:**

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Realtime Secret
openssl rand -base64 32

# Generate Postgres Password
openssl rand -base64 24
```

### 3.4 Create Supabase Kong Configuration

The docker-compose.yml references a Kong configuration file. Create it:

```bash
mkdir -p supabase
nano supabase/kong.yml
```

Paste the following minimal Kong configuration:

```yaml
_format_version: "2.1"
_transform: true

services:
  - name: auth-v1
    url: http://supabase-auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/

  - name: rest-v1
    url: http://supabase-rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/

  - name: realtime-v1
    url: http://supabase-realtime:4000/socket
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/

  - name: storage-v1
    url: http://supabase-storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
```

---

## Step 4: Build and Start Services

### 4.1 Build Docker Images

```bash
cd /opt/ai-adventure-scribe
docker compose build
```

This will build:
- Frontend (Vite React app with Nginx)
- CrewAI Service (Python FastAPI)

### 4.2 Start All Services

```bash
docker compose up -d
```

### 4.3 Verify Services Are Running

```bash
docker compose ps
```

You should see all services in "Up" state:
- adventure-app
- adventure-agents
- adventure-db
- adventure-rest
- adventure-realtime
- adventure-storage
- adventure-imgproxy
- adventure-auth
- adventure-kong

### 4.4 Check Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f app
docker compose logs -f agents
docker compose logs -f supabase-db
```

---

## Step 5: Initialize Database

### 5.1 Connect to PostgreSQL

```bash
docker compose exec supabase-db psql -U postgres
```

### 5.2 Run Migrations

If you have SQL migration files in `db/migrations/`:

```bash
# Copy migrations to container
docker cp db/migrations/ adventure-db:/tmp/migrations/

# Execute migrations
docker compose exec supabase-db psql -U postgres -f /tmp/migrations/001_initial_schema.sql
```

Or run them directly:

```bash
cat db/migrations/*.sql | docker compose exec -T supabase-db psql -U postgres
```

---

## Step 6: Access Your Application

### Frontend
```
http://<YOUR_SERVER_IP>:3000
```

### CrewAI Service
```
http://<YOUR_SERVER_IP>:8000
```

### Supabase API Gateway
```
http://<YOUR_SERVER_IP>:8001
```

---

## Step 7: Configure Domain and SSL (Optional but Recommended)

### 7.1 Point Domain to VPS

In your domain registrar, create an A record:

```
Type: A
Name: @
Value: <YOUR_SERVER_IP>
TTL: 300
```

For subdomains:

```
Type: A
Name: app
Value: <YOUR_SERVER_IP>

Type: A
Name: api
Value: <YOUR_SERVER_IP>
```

### 7.2 Install Nginx Reverse Proxy

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 7.3 Configure Nginx

Create `/etc/nginx/sites-available/ai-adventure-scribe`:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API Gateway
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/ai-adventure-scribe /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 7.4 Install SSL Certificates

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Follow the prompts. Certbot will automatically configure HTTPS.

---

## Step 8: Monitoring and Maintenance

### 8.1 View Service Status

```bash
docker compose ps
```

### 8.2 Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart app
```

### 8.3 Update Application

```bash
cd /opt/ai-adventure-scribe

# Pull latest code
git pull origin main
# OR rsync from local machine

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

### 8.4 Backup Database

```bash
# Create backup directory
mkdir -p /opt/backups

# Backup PostgreSQL database
docker compose exec supabase-db pg_dump -U postgres postgres > /opt/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup volumes
docker run --rm \
  -v ai-adventure-scribe-main_db-data:/source:ro \
  -v /opt/backups:/backup \
  ubuntu tar czf /backup/db_data_$(date +%Y%m%d_%H%M%S).tar.gz -C /source .
```

### 8.5 Set Up Automated Backups (Cron)

```bash
crontab -e
```

Add daily backup at 2 AM:

```cron
0 2 * * * docker compose -f /opt/ai-adventure-scribe/docker-compose.yml exec supabase-db pg_dump -U postgres postgres > /opt/backups/db_backup_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker compose logs

# Check disk space
df -h

# Check memory
free -h
```

### Database Connection Issues

```bash
# Verify database is running
docker compose exec supabase-db pg_isready -U postgres

# Check connection from application
docker compose exec app ping supabase-db
```

### Port Conflicts

```bash
# Check what's using a port
lsof -i :3000
netstat -tulpn | grep 3000

# Kill process if needed
kill -9 <PID>
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Remove images
docker compose down --rmi all

# Start fresh
docker compose up -d
```

---

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Use SSH keys** instead of passwords
3. **Disable root SSH login** after creating a sudo user
4. **Enable UFW firewall** (covered in Step 2.4)
5. **Keep system updated**: `apt update && apt upgrade -y`
6. **Use SSL certificates** (covered in Step 7.4)
7. **Implement rate limiting** in Kong/Nginx
8. **Regular backups** (covered in Step 8.4)
9. **Monitor logs** for suspicious activity
10. **Use environment variables** for secrets (never commit to Git)

---

## Scaling Considerations

### Vertical Scaling (Upgrade Server)

Hetzner allows easy server upgrades:
1. Go to Hetzner Cloud Console
2. Select your server → **Resize**
3. Choose larger plan
4. Server will reboot with more resources

### Horizontal Scaling (Multiple Servers)

For high traffic:
- Set up a load balancer (Hetzner Load Balancer)
- Deploy multiple app instances
- Use managed PostgreSQL (Hetzner Database)
- Separate database from application servers

---

## Support

- **Hetzner Docs**: https://docs.hetzner.com/
- **Docker Docs**: https://docs.docker.com/
- **Supabase Self-Hosting**: https://supabase.com/docs/guides/self-hosting

---

## Quick Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart app

# Rebuild after code changes
docker compose build && docker compose up -d

# Check service health
docker compose ps

# Database backup
docker compose exec supabase-db pg_dump -U postgres postgres > backup.sql

# Database restore
cat backup.sql | docker compose exec -T supabase-db psql -U postgres
```

---

**Your AI Adventure Scribe is now live on Hetzner! 🚀**

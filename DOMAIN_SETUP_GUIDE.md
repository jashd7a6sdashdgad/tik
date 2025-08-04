# Domain Setup Guide for Google OAuth2

## ❌ Problem
Google OAuth2 doesn't accept IP addresses as redirect URIs. Error messages:
- "Invalid Redirect: must end with a public top-level domain (such as .com or .org)"
- "Invalid Redirect: must use a domain that is a valid top private domain"

## ✅ Solutions

### Option 1: DuckDNS (Free & Quick)

**Steps:**
1. Go to [DuckDNS.org](https://www.duckdns.org/)
2. Sign in with Google/GitHub
3. Create subdomain: `mahboob-assistant.duckdns.org`
4. Point it to your IP: `31.97.186.247`
5. Update redirect URI: `https://mahboob-assistant.duckdns.org/api/google/callback`

**Configuration already set in environment files:**
```env
GOOGLE_REDIRECT_URI_SERVER=https://mahboob-assistant.duckdns.org/api/google/callback
```

### Option 2: ngrok (Development/Testing)

**Steps:**
1. Install ngrok: `npm install -g ngrok`
2. Run: `ngrok http 3000`
3. Use the HTTPS URL: `https://abc123.ngrok.io/api/google/callback`

**Pros:** Instant setup
**Cons:** URL changes each restart (unless paid plan)

### Option 3: Purchase Domain

**Recommended Providers:**
- **Cloudflare** - $8.57/year for .com
- **Namecheap** - $8.88/year for .com  
- **Google Domains** - $12/year for .com

**Steps:**
1. Buy domain (e.g., `mahboob-assistant.com`)
2. Set A record: `@` → `31.97.186.247`
3. Set A record: `www` → `31.97.186.247`
4. Update redirect URI: `https://mahboob-assistant.com/api/google/callback`

### Option 4: Cloudflare Tunnel (Free)

**Steps:**
1. Sign up at [Cloudflare](https://cloudflare.com)
2. Install cloudflared on your server
3. Create tunnel pointing to localhost:3000
4. Get free subdomain: `abc-def-ghi.trycloudflare.com`

## 🔧 Implementation Steps

### Step 1: Choose and Set Up Domain

Pick one of the options above and set up your domain to point to `31.97.186.247`.

### Step 2: Update Environment Variables

Update your actual domain in the environment files:

**.env.local:**
```env
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_REDIRECT_URI_SERVER=https://YOUR-DOMAIN.com/api/google/callback
```

**.env.production:**
```env
GOOGLE_REDIRECT_URI=https://YOUR-DOMAIN.com/api/google/callback
GOOGLE_REDIRECT_URI_SERVER=https://YOUR-DOMAIN.com/api/google/callback
```

### Step 3: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/google/callback` (development)
   - `https://YOUR-DOMAIN.com/api/google/callback` (production)
5. Remove the old IP-based URI
6. Click **Save**

### Step 4: SSL Certificate (HTTPS)

For production domains, you'll need HTTPS:

**Option A: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure nginx/apache to use certificates
```

**Option B: Cloudflare (Free)**
- Use Cloudflare as DNS provider
- Enable "Flexible SSL" in dashboard
- Automatic HTTPS with their certificates

### Step 5: Test Configuration

```bash
# Test the domain resolves to your IP
nslookup yourdomain.com

# Test the redirect URI
curl https://yourdomain.com/api/google/callback
```

## 🌟 Recommended: DuckDNS Setup

**Why DuckDNS:**
- ✅ Completely free
- ✅ No registration needed (use Google login)
- ✅ Instant setup
- ✅ Supports HTTPS
- ✅ No domain renewal

**Quick Setup:**

1. **Visit DuckDNS:** https://www.duckdns.org/
2. **Sign in** with your Google account
3. **Create subdomain:** `mahboob-assistant` 
4. **Set IP:** `31.97.186.247`
5. **Copy token** for future updates

**URL will be:** `https://mahboob-assistant.duckdns.org`

**DuckDNS Auto-Update Script:**
```bash
#!/bin/bash
# Save as update-duckdns.sh
echo url="https://www.duckdns.org/update?domains=mahboob-assistant&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -

# Add to crontab for auto-updates:
# */5 * * * * ~/duckdns/update-duckdns.sh >/dev/null 2>&1
```

## 🔄 Migration Checklist

- [ ] **Choose domain solution** (DuckDNS recommended)
- [ ] **Set up domain** pointing to `31.97.186.247`
- [ ] **Update environment variables** with actual domain
- [ ] **Update Google Cloud Console** redirect URIs
- [ ] **Set up HTTPS** (if using custom domain)
- [ ] **Test OAuth flow** in both environments
- [ ] **Update any hardcoded URLs** in application

## 🐛 Troubleshooting

### Domain Not Resolving
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com

# Wait up to 24 hours for DNS propagation
```

### SSL Certificate Issues
```bash
# Check certificate
openssl s_client -connect yourdomain.com:443

# Test HTTPS
curl -I https://yourdomain.com
```

### OAuth Redirect Issues
- Ensure redirect URI exactly matches what's in Google Cloud Console
- Check for trailing slashes, http vs https
- Verify domain is accessible from internet

## 📝 Current Configuration

The environment files are already updated with DuckDNS example:
```env
GOOGLE_REDIRECT_URI_SERVER=https://mahboob-assistant.duckdns.org/api/google/callback
```

**Next steps:**
1. Set up the actual domain (DuckDNS or your choice)
2. Replace `mahboob-assistant.duckdns.org` with your actual domain
3. Update Google Cloud Console with the new redirect URI

Your Google OAuth2 will then work with a proper domain instead of the IP address!
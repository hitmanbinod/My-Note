# Deployment Guide

This guide covers deploying the My Notes PWA to Cloudflare Pages or other static hosting platforms.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Google Cloud Project with OAuth credentials
- Git repository (for automatic deployments)

## Environment Configuration

### 1. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Drive API**
4. Configure OAuth consent screen:
   - User type: External
   - Add scopes: `drive.file`, `userinfo.email`, `userinfo.profile`
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Add authorized origins: `https://your-domain.com`
   - Add redirect URIs: `https://your-domain.com/auth/callback`
6. Copy the Client ID

### 2. Configure Environment Variables

Create `.env.production`:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=My Notes
```

## Deployment to Cloudflare Pages

### Option 1: Automatic Git Integration

1. **Connect Repository**
   ```bash
   # Push code to GitHub/GitLab
   git remote add origin https://github.com/your-username/notebook-app.git
   git push -u origin main
   ```

2. **Configure Cloudflare Pages**
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project"
   - Connect your Git repository
   - Configure build settings:
     - Build command: `npm run build`
     - Build output directory: `dist`
     - Root directory: `/`
   - Add environment variables (from `.env.production`)
   - Click "Save and Deploy"

3. **Custom Domain (Optional)**
   - Go to project settings → Custom domains
   - Add your domain
   - Update DNS records as instructed

### Option 2: Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy with Wrangler**
   ```bash
   npm install -g wrangler
   wrangler login
   wrangler pages deploy dist --project-name=my-notes-app
   ```

### Post-Deployment Steps

1. **Update Google OAuth Redirect URIs**
   - Add production URL to authorized origins
   - Add `https://your-domain.com/auth/callback` to redirect URIs

2. **Test PWA Installation**
   - Visit your deployed app
   - Check for "Install" prompt
   - Verify offline functionality

3. **Verify Security Headers**
   ```bash
   curl -I https://your-domain.com
   ```
   Should include CSP, X-Frame-Options, etc.

## Alternative Hosting Platforms

### Vercel

```bash
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard.

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Configure environment variables in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy to gh-pages branch:
   ```bash
   npm install -g gh-pages
   gh-pages -d dist
   ```

3. Enable GitHub Pages in repository settings

**Note**: GitHub Pages doesn't support custom headers, so CSP will be limited.

## Performance Optimization

### 1. Enable Compression

Cloudflare automatically handles Brotli/Gzip compression.

### 2. Configure Caching

The `_headers` file includes optimal cache settings:
- Static assets: 1 year
- HTML: No cache
- Service Worker: No cache

### 3. Lighthouse Audit

Run before deploying:
```bash
npm install -g @lhci/cli
lhci autorun --config=lighthouserc.json
```

Target scores:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: 100

## Monitoring

### Error Tracking (Optional)

Add Sentry DSN to environment:
```
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### Analytics (Optional)

If needed, add privacy-respecting analytics like Plausible or Fathom.

## Security Checklist

- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] OAuth credentials secured
- [ ] Environment variables not committed to Git
- [ ] Service Worker properly scoped
- [ ] Subresource Integrity for CDN resources
- [ ] Regular dependency updates

## Rollback

If deployment fails:

### Cloudflare Pages
- Go to Deployments
- Click on previous successful deployment
- Click "Retry deployment" or "Promote to production"

### Manual
```bash
git revert HEAD
git push origin main
```

## Troubleshooting

### Build Fails

Check Node version:
```bash
node --version  # Should be 18+
```

Clear cache:
```bash
rm -rf node_modules package-lock.json
npm install
```

### OAuth Not Working

- Verify redirect URIs match exactly (no trailing slash)
- Check authorized origins include protocol
- Ensure environment variables are set

### Service Worker Issues

Clear service worker:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});
```

### PWA Not Installing

- Check manifest.json is served with correct MIME type
- Verify all icons exist and are accessible
- Ensure HTTPS is enabled
- Check browser console for errors

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          VITE_GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-notes-app
          directory: dist
```

## Updates and Maintenance

### Updating the App

1. Make changes
2. Update version in `package.json`
3. Build and test locally
4. Push to repository (auto-deploys)

### Database Migrations

When updating IndexedDB schema:

1. Increment version in `database.ts`
2. Add migration logic in Dexie version upgrade
3. Test with existing data before deploying

### Breaking Changes

Communicate with users via:
- In-app notification
- Release notes
- Email (if collected)

## Support

For deployment issues:
- Check Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- Review build logs in dashboard
- Test locally with `npm run preview`

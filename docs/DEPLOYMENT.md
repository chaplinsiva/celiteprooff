# Cloudflare Pages Deployment Guide

## Prerequisites

- Cloudflare account
- Project pushed to GitHub/GitLab

## Deployment Steps

### 1. Connect Repository

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Create a project"
3. Connect your Git provider
4. Select the `celitepro` repository

### 2. Build Settings

| Setting | Value |
|---------|-------|
| Framework preset | Next.js |
| Build command | `npm run build` |
| Build output directory | `.next` |
| Root directory | `/` |

### 3. Environment Variables

Add these in the Cloudflare dashboard:

```
PLAINLY_API_KEY=your_plainly_api_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_SECRET=your_supabase_service_secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 4. Deploy

Click "Save and Deploy" to start the build.

## Custom Domain

1. Go to project settings → Custom domains
2. Add your domain
3. Update DNS records as instructed

## Environment Variables

For production, set these in Cloudflare Pages:

| Variable | Description |
|----------|-------------|
| `PLAINLY_API_KEY` | Plainly API key |
| `SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_SECRET` | Supabase service key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |

## Troubleshooting

### Build Fails

Check that all dependencies are in `package.json` and not relying on global installations.

### API Routes Not Working

Ensure Cloudflare Pages is running with the Edge runtime. Next.js App Router API routes are supported natively.

### Images Not Loading

Add your image domains to `next.config.mjs`:

```js
images: {
  domains: ['your-supabase-project.supabase.co'],
}
```

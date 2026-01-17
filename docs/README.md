# CelitePro - Video Template Automation Platform

A Next.js 14 application for automating video template rendering with Plainly API integration.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Create a `.env` file with:

```env
PLAINLY_API_KEY=your_plainly_api_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_SECRET=your_supabase_service_secret
SUPABASE_PROJECT_ID=your_project_id
```

## Project Structure

```
celitepro/
├── src/
│   ├── app/
│   │   ├── api/render/route.ts  # Render API endpoint
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Home page
│   │   └── globals.css          # Design system
│   ├── components/
│   │   ├── Header.tsx           # Navigation header
│   │   ├── Hero.tsx             # Landing hero section
│   │   ├── Templates.tsx        # Template gallery
│   │   ├── TemplateCard.tsx     # Individual template card
│   │   ├── TemplateDetail.tsx   # Template detail modal
│   │   └── Editor.tsx           # Template editor
│   └── lib/
│       ├── supabase.ts          # Supabase client & types
│       └── plainly.ts           # Plainly API client
├── previews/videos/             # Preview video files
└── templates/                   # Template ZIP files
```

## Key Features

- **Template Gallery**: Browse and search video templates
- **Live Preview**: Video previews with hover-to-play
- **Customization Editor**: Edit text, colors, and media placeholders
- **Render Pipeline**: Automated video rendering via Plainly API
- **Auto-cleanup**: Templates deleted from Plainly after 1 minute

## Workflow

1. User selects a template from the gallery
2. Opens the customization editor
3. Edits text, colors, and placeholders
4. Clicks "Render Video"
5. Template ZIP uploaded to Plainly
6. Video rendered with customizations
7. User receives preview and download links
8. Template auto-deleted from Plainly after 60 seconds

## Database Schema

**templates** - Stores template metadata
- `id`, `name`, `slug`, `description`, `category`
- `preview_video`, `zip_path`, `placeholders`

**render_jobs** - Tracks render requests
- `id`, `template_id`, `plainly_render_id`
- `status`, `parameters`, `preview_url`, `download_url`

## Deployment (Cloudflare)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Cloudflare Pages deployment instructions.

## License

Private - All rights reserved

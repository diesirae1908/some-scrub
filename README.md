# SoMe Scrub — TikTok Trend Research Tool

Research TikTok trends, analyze video hooks with Claude AI, and generate creative briefs tailored to Atome Bakery's brand.

## Features

- **Search** TikTok by keyword, hashtag, or account name
- **Filter** by date range and number of results
- **Results dashboard** with aggregate stats (total views, likes, avg engagement)
- **Video detail modal** with full metrics + TikTok link
- **AI Analysis** powered by Claude — analyzes hook type, theme, funnel stage, and comment insights
- **Generate Creative Brief** — one click to get a brief tailored to Atome's brand
- **Bookmarks** — save videos for later analysis
- **Export CSV** — export search results to spreadsheet
- **Brand Profile** — configure Atome's brand bible, tone of voice, and brief template

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

The `.env.local` file already contains your Anthropic API key. Do not share or commit this file.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First-Time Setup

1. Go to **Brand Profile** (top nav) and fill in Atome Bakery's details:
   - Product description, target audience, brand values, tone of voice
   - Brand Bible (paste full brand guidelines)
   - Brief template (customize the structure of generated briefs)
   - Competitor TikTok accounts to track

2. Search for keywords like `french bakery`, `croissant`, `artisan bread`, etc.

3. Click any video to see details, then click **Analyze Now** to get AI insights.

4. Click **Generate Brief** to produce a creative brief tailored to Atome.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (dark theme)
- **Anthropic Claude** (claude-opus-4-5) for AI analysis and brief generation
- **tikwm.com** free API for TikTok data (no API key needed)
- **localStorage** for persisting bookmarks, sessions, and brand profile

## Data & Privacy

- All data is stored locally in your browser (localStorage)
- No database or backend storage
- TikTok data is fetched in real-time via the tikwm.com public API

# Latest Background (Next.js + Vercel Blob + Vercel KV)

Community background image sharing platform with camera capture functionality.

## 🚀 Features

- **Portfolio-style Homepage**: Modern design showcasing artist information
- **Camera Photobooth**: Real-time camera capture and upload
- **Dynamic Backgrounds**: User uploads become site backgrounds
- **Image Processing**: Sharp compression, EXIF removal, auto-rotation
- **Dual Storage**: Public current image + private timestamped backups
- **Performance Monitoring**: Vercel Speed Insights integration
- **Cache Busting**: Version-based URL system for instant updates

## 🛠 Setup

### 1. Local Development

```bash
# Clone the repository
git clone https://github.com/chengchew0204/latest-bg.git
cd latest-bg

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.local.example .env.local
# Edit .env.local with your Vercel credentials
```

### 2. Vercel Integration Setup

1. **Create Vercel Project**: Connect your GitHub repository
2. **Add Vercel KV**: Go to Storage → Create → KV
3. **Add Vercel Blob**: Go to Storage → Create → Blob

### 3. Environment Variables

#### Required Environment Variables:

```env
# Vercel KV (Redis)
KV_URL=rediss://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
REDIS_URL=rediss://...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

#### Setting Environment Variables:

**Option A: Vercel Dashboard**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add each variable for Production/Preview/Development

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
# ... add all required variables
```

### 4. Deploy

```bash
# Deploy to Vercel
vercel

# Or push to GitHub (auto-deploy)
git push origin main
```

## 📁 Project Structure

```
app/
├── layout.tsx          # Root layout with Speed Insights
├── page.tsx           # Homepage (portfolio style)
├── Photobooth/        # Camera capture page
│   └── page.tsx
├── api/
│   ├── upload/        # Image upload & processing
│   │   └── route.ts
│   └── bg/            # Background image service
│       └── route.ts
└── globals.css
```

## 🔧 API Endpoints

- `GET /bg` - Current background image (with cache-busting)
- `POST /api/upload` - Upload and process new background image

## 📊 Storage Structure

**Vercel Blob:**
- `bg/current.jpg` - Current public background (overwritten)
- `backups/YYYY/MM/DD/UUID.jpg` - Timestamped private backups

**Vercel KV:**
- `bg:current` - Metadata with current image URL and version

## 🔒 Privacy & Security

- **EXIF Removal**: GPS and metadata automatically stripped
- **Image Compression**: Max 1920px width, JPEG ~82% quality
- **Rate Limiting**: Consider adding for production use
- **Moderation**: Add review queue for content moderation

## 🎯 Performance

- **Core Web Vitals**: Monitored via Vercel Speed Insights
- **Static Generation**: Homepage pre-rendered
- **Edge Runtime**: Fast API responses
- **Image Optimization**: Sharp processing pipeline

## 🚨 Troubleshooting

### "No token found" Error
This means environment variables aren't set in Vercel:
1. Check Vercel project settings → Environment Variables
2. Ensure all required variables are added
3. Redeploy after adding variables

### Build Failures
- Check TypeScript errors in build logs
- Ensure all dependencies are installed
- Verify environment variables are set

## 📄 License

MIT License - feel free to use for your own projects!# Force deployment trigger

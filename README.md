# Latest Background (Next.js + Vercel Blob + Vercel KV)

## Setup
1. Create a Vercel project and add **Vercel Blob** and **Vercel KV** integrations.
2. Fill `.env.local`:
   - `KV_REST_API_URL`, `KV_REST_API_TOKEN`
   - `BLOB_READ_WRITE_TOKEN`
3. `npm install && npm run dev`

## Deploy
- `vercel` then set env vars in Vercel dashboard.  
- After first successful upload:
  - Public: `bg/current.jpg`
  - Private backup: `backups/YYYY/MM/DD/UUID.jpg`

## Notes
- Server strips EXIF/GPS and recompresses to JPEG ~82% with max width 1920.
- `/bg` is a stable URL that redirects to the current Blob with a version query for cache-busting.
- To moderate uploads, add authentication/captcha and a review queue before writing to `bg/current.jpg`.
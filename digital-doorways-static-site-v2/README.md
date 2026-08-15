# Digital Doorways — Static Website

A single-page, responsive static site inspired by the editorial, typography-first approach of Nothin' (noth.in), but written and designed specifically for Digital Doorways.

## Files
- index.html — page structure/content
- styles.css — all visual styling/responsive layout
- script.js — small interaction layer

## Replace before launch
1. Replace the six `.media-01` through `.media-06` gallery blocks with real project images or `<video>` thumbnails.
2. Change `hello@digitaldoorways.co` to your actual business email.
3. Add your real social links.
4. Replace project names/categories with actual clients and work.
5. Connect "Start a project" to your booking/contact form if desired.

## Run locally
Open `index.html` in a browser, or use any static host such as Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.


## New features
- Cinematic project poster images
- Optional hover-to-play video previews
- Click any project to open a full-screen case-study modal
- Client/logo wall section
- Responsive logo grid

### Adding your actual videos
Inside each project card, set the `<source src="">` to your MP4/WebM file. For example:
`<source src="assets/client-project.mp4" type="video/mp4">`

Keep the `poster` image so the gallery still looks polished before the video loads.

### Adding real client logos
Replace the text inside `.client-logo` with an `<img>`:
`<img src="assets/client-logo.svg" alt="Client Name">`

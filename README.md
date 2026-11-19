# Travel Planner

A simple, installable travel planner: trips, day-by-day itinerary, budget tracker and packing list. Works offline and stores data on your device.

**Live app:** https://aidan17715.github.io/travel-planner/

## Install on any device

- **Phone (Android/Chrome):** open the link → menu → *Install app* / *Add to Home screen*.
- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.
- **PC/Mac (Chrome/Edge):** open the link → click the install icon in the address bar.

## Moving data between devices

Data is stored locally on each device. Use **Export** on one device to save a `.json` backup, then **Import** it on another.

## Development

```
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run lint
```

Pushing to `main` automatically deploys to GitHub Pages (see `.github/workflows/deploy.yml`).

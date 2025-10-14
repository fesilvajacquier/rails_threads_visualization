# Puma Threads Visualization

An interactive visualization showing how Ruby/Puma threads compete for the Global VM Lock (GVL).

## Features

- Configure number of threads (1-10)
- Select request types per thread:
  - **Low IO**: 3 small DB queries (30ms IO, 90ms CPU)
  - **Heavy IO**: External API/LLM call (500ms IO, 60ms CPU)
- Real-time visualization of:
  - Green: Thread using CPU (has GVL)
  - Yellow: Thread waiting on IO (released GVL)
  - Red: Thread blocked waiting for GVL

## Local Development

Simply open `index.html` in a web browser. No build step required.

## Deployment to GitHub Pages

### Option 1: Deploy from docs folder

1. Create `docs` folder and move files:
   ```bash
   mkdir -p docs
   cp index.html styles.css simulation.js docs/
   git add docs/
   git commit -m "chore: prepare for GitHub Pages deployment"
   git push
   ```

2. In GitHub repo settings → Pages:
   - Source: Deploy from branch
   - Branch: main
   - Folder: /docs
   - Save

### Option 2: Deploy from root

1. Push to GitHub:
   ```bash
   git push
   ```

2. In GitHub repo settings → Pages:
   - Source: Deploy from branch
   - Branch: main
   - Folder: / (root)
   - Save

Your site will be available at: `https://<username>.github.io/<repo-name>/`

## Technical Details

- Pure vanilla JavaScript (no dependencies)
- CSS Flexbox for responsive layout
- Simulation runs in 1ms time steps
- GVL is modeled as exclusive lock (only one thread can hold it)
- IO operations release the GVL, allowing other threads to proceed

## Purpose

This visualization demonstrates why adding more Puma threads doesn't always improve performance. When threads spend most of their time waiting for the GVL (red), adding more threads increases contention without adding throughput.

# Puma Threads Visualization Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Build a static webpage that visualizes Ruby/Puma thread contention with the GVL (Global VM Lock), showing how threads compete for CPU time and spend time waiting on IO.

**Architecture:** Single-page vanilla JavaScript application with three files: HTML for structure, CSS for styling, and JS for simulation logic. The simulation engine models concurrent thread execution with GVL contention, outputting timeline events that are rendered as colored bar segments.

**Tech Stack:** HTML5, CSS3 (Flexbox), Vanilla JavaScript (ES6+), GitHub Pages for deployment

---

## Task 1: Create Basic HTML Structure

**Files:**
- Create: `index.html`

**Step 1: Create HTML file with semantic structure**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Puma Threads Visualization - GVL Contention</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Puma Threads Visualization</h1>
        <p>Visualize how Ruby threads compete for the Global VM Lock (GVL)</p>
    </header>

    <main>
        <section id="controls">
            <h2>Configuration</h2>
            <div class="control-group">
                <label for="thread-count">Number of Threads:</label>
                <input type="number" id="thread-count" min="1" max="10" value="3">
            </div>
            <div id="thread-configs"></div>
            <button id="regenerate">Generate Visualization</button>
        </section>

        <section id="legend">
            <h3>Legend</h3>
            <div class="legend-items">
                <div class="legend-item">
                    <span class="color-box cpu"></span>
                    <span>Green: Using CPU (has GVL)</span>
                </div>
                <div class="legend-item">
                    <span class="color-box io"></span>
                    <span>Yellow: Waiting on IO (released GVL)</span>
                </div>
                <div class="legend-item">
                    <span class="color-box blocked"></span>
                    <span>Red: Blocked waiting for GVL</span>
                </div>
            </div>
        </section>

        <section id="visualization">
            <h2>Thread Timeline</h2>
            <div id="threads-container"></div>
        </section>
    </main>

    <script src="simulation.js"></script>
</body>
</html>
```

**Step 2: Verify file in browser**

Open `index.html` in browser (file:// protocol works fine).
Expected: Basic structure visible, no styling yet.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add basic HTML structure for visualization"
```

---

## Task 2: Create CSS Styling

**Files:**
- Create: `styles.css`

**Step 1: Create base styles and layout**

Create `styles.css`:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f5f5f5;
}

header {
    background: #2c3e50;
    color: white;
    padding: 2rem;
    text-align: center;
}

header h1 {
    margin-bottom: 0.5rem;
}

header p {
    color: #ecf0f1;
}

main {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
}

section {
    background: white;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h2 {
    margin-bottom: 1rem;
    color: #2c3e50;
}

h3 {
    margin-bottom: 0.75rem;
    color: #34495e;
}

/* Controls Section */
.control-group {
    margin-bottom: 1rem;
}

.control-group label {
    display: inline-block;
    width: 150px;
    font-weight: 500;
}

.control-group input {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

#thread-configs {
    margin: 1rem 0;
}

.thread-config {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
}

.thread-config label {
    width: 100px;
    font-weight: 500;
}

.thread-config select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    flex-grow: 1;
    max-width: 300px;
}

button {
    background: #3498db;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover {
    background: #2980b9;
}

/* Legend Section */
.legend-items {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.color-box {
    width: 30px;
    height: 20px;
    border: 1px solid #ddd;
    border-radius: 3px;
}

.color-box.cpu {
    background: #22c55e;
}

.color-box.io {
    background: #fbbf24;
}

.color-box.blocked {
    background: #ef4444;
}

/* Visualization Section */
#threads-container {
    margin-top: 1rem;
}

.thread-bar {
    margin-bottom: 1.5rem;
}

.thread-label {
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #555;
}

.timeline {
    display: flex;
    height: 40px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
}

.segment {
    height: 100%;
    border-right: 1px solid rgba(255,255,255,0.3);
    position: relative;
    cursor: help;
}

.segment:last-child {
    border-right: none;
}

.segment.cpu {
    background: #22c55e;
}

.segment.io {
    background: #fbbf24;
}

.segment.blocked {
    background: #ef4444;
}

.segment:hover {
    opacity: 0.8;
}

/* Responsive Design */
@media (max-width: 768px) {
    main {
        padding: 0 0.5rem;
    }

    .legend-items {
        flex-direction: column;
        gap: 0.75rem;
    }

    .thread-config {
        flex-direction: column;
        align-items: flex-start;
    }

    .thread-config select {
        max-width: 100%;
        width: 100%;
    }
}
```

**Step 2: Verify styling in browser**

Refresh browser with `index.html`.
Expected: Professional styling with proper layout, colors, responsive design.

**Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add complete CSS styling for visualization"
```

---

## Task 3: Create Request Profiles and Simulation Core

**Files:**
- Create: `simulation.js`

**Step 1: Create request profiles and constants**

Create `simulation.js`:

```javascript
// Request type profiles with timing characteristics
const REQUEST_PROFILES = {
    'low-io': {
        name: 'Low IO (3 small DB queries)',
        phases: [
            { type: 'cpu', duration: 20 },  // Initial processing
            { type: 'io', duration: 10 },   // DB query 1
            { type: 'cpu', duration: 20 },  // Processing
            { type: 'io', duration: 10 },   // DB query 2
            { type: 'cpu', duration: 20 },  // Processing
            { type: 'io', duration: 10 },   // DB query 3
            { type: 'cpu', duration: 30 },  // Final processing
        ]
    },
    'heavy-io': {
        name: 'Heavy IO (LLM API call)',
        phases: [
            { type: 'cpu', duration: 10 },   // Setup
            { type: 'io', duration: 500 },   // External API call
            { type: 'cpu', duration: 50 },   // Process response
        ]
    }
};

// State type constants
const STATE = {
    CPU: 'cpu',      // Thread is using CPU (has GVL)
    IO: 'io',        // Thread is waiting on IO (released GVL)
    BLOCKED: 'blocked', // Thread wants CPU but GVL is held by another
    IDLE: 'idle'     // Thread finished its request
};
```

**Step 2: Verify constants load**

Open browser console, reload page.
Expected: No errors in console.

**Step 3: Commit**

```bash
git add simulation.js
git commit -m "feat: add request profiles and state constants"
```

---

## Task 4: Implement Simulation Engine

**Files:**
- Modify: `simulation.js` (append to existing file)

**Step 1: Add simulation engine function**

Append to `simulation.js`:

```javascript
/**
 * Simulates concurrent thread execution with GVL contention
 * @param {Array<string>} threadConfigs - Array of profile keys (e.g., ['low-io', 'heavy-io', 'low-io'])
 * @returns {Array<Array<{state: string, startTime: number, duration: number}>>} Timeline for each thread
 */
function simulateThreads(threadConfigs) {
    const threads = threadConfigs.map(profileKey => ({
        profile: REQUEST_PROFILES[profileKey],
        currentPhaseIndex: 0,
        phaseStartTime: 0,
        finished: false
    }));

    const timelines = threadConfigs.map(() => []);
    let currentTime = 0;
    let gvlHolder = null; // Index of thread currently holding GVL, or null

    // Calculate total duration needed for simulation
    const maxDuration = Math.max(...threads.map(t =>
        t.profile.phases.reduce((sum, phase) => sum + phase.duration, 0)
    ));

    // Simulate time step by step (1ms increments)
    while (currentTime <= maxDuration) {
        // Determine current state for each thread
        threads.forEach((thread, idx) => {
            if (thread.finished) return;

            const currentPhase = thread.profile.phases[thread.currentPhaseIndex];
            const phaseElapsed = currentTime - thread.phaseStartTime;

            // Check if current phase is complete
            if (phaseElapsed >= currentPhase.duration) {
                thread.currentPhaseIndex++;
                thread.phaseStartTime = currentTime;

                // Check if thread finished all phases
                if (thread.currentPhaseIndex >= thread.profile.phases.length) {
                    thread.finished = true;
                    return;
                }
            }
        });

        // Release GVL if holder is now doing IO or finished
        if (gvlHolder !== null) {
            const holder = threads[gvlHolder];
            if (holder.finished) {
                gvlHolder = null;
            } else {
                const holderPhase = holder.profile.phases[holder.currentPhaseIndex];
                if (holderPhase.type === 'io') {
                    gvlHolder = null;
                }
            }
        }

        // Assign GVL if free and threads need it
        if (gvlHolder === null) {
            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                if (!thread.finished) {
                    const phase = thread.profile.phases[thread.currentPhaseIndex];
                    if (phase.type === 'cpu') {
                        gvlHolder = i;
                        break;
                    }
                }
            }
        }

        // Record state for each thread at this time
        threads.forEach((thread, idx) => {
            if (thread.finished) return;

            const phase = thread.profile.phases[thread.currentPhaseIndex];
            let state;

            if (phase.type === 'io') {
                state = STATE.IO;
            } else if (phase.type === 'cpu') {
                state = (gvlHolder === idx) ? STATE.CPU : STATE.BLOCKED;
            }

            // Add or extend timeline segment
            const lastSegment = timelines[idx][timelines[idx].length - 1];
            if (lastSegment && lastSegment.state === state) {
                // Extend existing segment
                lastSegment.duration++;
            } else {
                // Start new segment
                timelines[idx].push({
                    state: state,
                    startTime: currentTime,
                    duration: 1
                });
            }
        });

        currentTime++;
    }

    return timelines;
}
```

**Step 2: Test simulation in console**

Open browser console, run:
```javascript
const result = simulateThreads(['low-io', 'heavy-io']);
console.log(result);
```

Expected: Array of timeline arrays with state segments, no errors.

**Step 3: Verify basic logic**

In console:
```javascript
const single = simulateThreads(['low-io']);
console.log('Single thread should have no BLOCKED states:',
    single[0].every(seg => seg.state !== 'blocked'));
```

Expected: `true` printed (single thread never blocks).

**Step 4: Commit**

```bash
git add simulation.js
git commit -m "feat: implement GVL simulation engine"
```

---

## Task 5: Implement Rendering Logic

**Files:**
- Modify: `simulation.js` (append to existing file)

**Step 1: Add rendering function**

Append to `simulation.js`:

```javascript
/**
 * Renders thread timelines as colored bar segments
 * @param {Array<Array<{state: string, startTime: number, duration: number}>>} timelines
 */
function renderVisualization(timelines) {
    const container = document.getElementById('threads-container');
    container.innerHTML = ''; // Clear previous visualization

    if (timelines.length === 0) {
        container.innerHTML = '<p>Adjust settings to see visualization</p>';
        return;
    }

    timelines.forEach((timeline, threadIdx) => {
        // Create thread bar container
        const threadBar = document.createElement('div');
        threadBar.className = 'thread-bar';

        // Calculate total time for this thread
        const totalTime = timeline.reduce((sum, seg) => sum + seg.duration, 0);

        // Create label
        const label = document.createElement('div');
        label.className = 'thread-label';
        label.innerHTML = `
            <span>Thread ${threadIdx + 1}</span>
            <span>${totalTime}ms</span>
        `;
        threadBar.appendChild(label);

        // Create timeline container
        const timelineEl = document.createElement('div');
        timelineEl.className = 'timeline';

        // Add segments
        timeline.forEach(segment => {
            const segmentEl = document.createElement('div');
            segmentEl.className = `segment ${segment.state}`;

            // Calculate width as percentage of total time
            const widthPercent = (segment.duration / totalTime) * 100;
            segmentEl.style.flexBasis = `${widthPercent}%`;
            segmentEl.style.minWidth = '2px'; // Ensure very short segments are visible

            // Add tooltip
            const stateNames = {
                'cpu': 'Using CPU',
                'io': 'Waiting on IO',
                'blocked': 'Blocked (waiting for GVL)'
            };
            segmentEl.title = `${stateNames[segment.state]}: ${segment.startTime}-${segment.startTime + segment.duration}ms`;

            timelineEl.appendChild(segmentEl);
        });

        threadBar.appendChild(timelineEl);
        container.appendChild(threadBar);
    });
}
```

**Step 2: Test rendering in console**

In console:
```javascript
const timelines = simulateThreads(['low-io', 'heavy-io', 'low-io']);
renderVisualization(timelines);
```

Expected: Colored bars appear in visualization section with proper labels and tooltips.

**Step 3: Verify colors and proportions**

Visually inspect:
- Green segments for CPU
- Yellow segments for IO
- Red segments for blocked threads
- Tooltips show timing info on hover

**Step 4: Commit**

```bash
git add simulation.js
git commit -m "feat: implement timeline rendering with colored segments"
```

---

## Task 6: Add Controls and Event Handlers

**Files:**
- Modify: `simulation.js` (append to existing file)

**Step 1: Add thread config generation**

Append to `simulation.js`:

```javascript
/**
 * Generates thread configuration dropdowns based on thread count
 * @param {number} threadCount
 */
function generateThreadConfigs(threadCount) {
    const container = document.getElementById('thread-configs');
    container.innerHTML = '';

    for (let i = 0; i < threadCount; i++) {
        const configDiv = document.createElement('div');
        configDiv.className = 'thread-config';

        const label = document.createElement('label');
        label.textContent = `Thread ${i + 1}:`;
        label.htmlFor = `thread-${i}-type`;

        const select = document.createElement('select');
        select.id = `thread-${i}-type`;
        select.innerHTML = `
            <option value="low-io">Low IO (3 small DB queries)</option>
            <option value="heavy-io">Heavy IO (LLM API call)</option>
        `;

        configDiv.appendChild(label);
        configDiv.appendChild(select);
        container.appendChild(configDiv);
    }
}

/**
 * Collects current thread configurations from UI
 * @returns {Array<string>} Array of profile keys
 */
function getThreadConfigs() {
    const threadCountInput = document.getElementById('thread-count');
    const threadCount = parseInt(threadCountInput.value) || 3;

    const configs = [];
    for (let i = 0; i < threadCount; i++) {
        const select = document.getElementById(`thread-${i}-type`);
        configs.push(select ? select.value : 'low-io');
    }
    return configs;
}

/**
 * Main function to update visualization
 */
function updateVisualization() {
    const configs = getThreadConfigs();
    const timelines = simulateThreads(configs);
    renderVisualization(timelines);
}
```

**Step 2: Add initialization code**

Append to `simulation.js`:

```javascript
/**
 * Initialize application on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    const threadCountInput = document.getElementById('thread-count');
    const regenerateButton = document.getElementById('regenerate');

    // Initialize with default thread count
    const initialThreadCount = parseInt(threadCountInput.value) || 3;
    generateThreadConfigs(initialThreadCount);
    updateVisualization();

    // Update configs when thread count changes
    threadCountInput.addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        if (count >= 1 && count <= 10) {
            generateThreadConfigs(count);
            updateVisualization();
        }
    });

    // Regenerate on button click
    regenerateButton.addEventListener('click', () => {
        updateVisualization();
    });

    // Update when any thread config dropdown changes
    document.getElementById('thread-configs').addEventListener('change', (e) => {
        if (e.target.tagName === 'SELECT') {
            updateVisualization();
        }
    });
});
```

**Step 3: Test full interaction flow**

1. Open page in browser
2. Expected: 3 thread dropdowns appear by default with visualization
3. Change thread count to 5
4. Expected: 5 dropdowns appear, visualization updates
5. Change a thread type from "Low IO" to "Heavy IO"
6. Expected: Visualization updates immediately
7. Click "Generate Visualization" button
8. Expected: Visualization regenerates

**Step 4: Test edge cases**

In browser:
1. Set thread count to 1
   - Expected: Single thread bar, no red segments
2. Set thread count to 10
   - Expected: 10 threads, lots of GVL contention (red)
3. Try invalid input (0 or 11)
   - Expected: Clamped to valid range

**Step 5: Commit**

```bash
git add simulation.js
git commit -m "feat: add controls and event handlers for interactive visualization"
```

---

## Task 7: Test and Deploy to GitHub Pages

**Files:**
- Create: `README.md`
- Verify all files work together

**Step 1: Create README with deployment instructions**

Create `README.md`:

```markdown
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
```

**Step 2: Final end-to-end test**

1. Open `index.html` in browser
2. Test all interactions:
   - Change thread count
   - Change request types
   - Hover over segments to see tooltips
   - Verify colors match legend
3. Test responsive design:
   - Resize browser window
   - Check mobile view (developer tools)

Expected: Everything works smoothly, visualization is clear and informative.

**Step 3: Commit README**

```bash
git add README.md
git commit -m "docs: add README with deployment instructions"
```

**Step 4: Create deployment commit**

Option A (deploy from root):
```bash
# Already ready - all files in root
git push origin feature/visualization
```

Option B (deploy from docs folder):
```bash
mkdir -p docs
cp index.html styles.css simulation.js docs/
git add docs/
git commit -m "chore: add docs folder for GitHub Pages"
git push origin feature/visualization
```

**Step 5: Configure GitHub Pages**

1. Push branch to GitHub
2. Go to repository settings → Pages
3. Select source:
   - Branch: `feature/visualization` (or merge to main first)
   - Folder: `/` (root) or `/docs` depending on choice
4. Save and wait for deployment (~1 minute)
5. Visit the deployed site

Expected: Site is live and fully functional on GitHub Pages.

**Step 6: Final verification**

Visit deployed URL and verify:
- All styling loads correctly
- JavaScript runs without errors
- Interactions work
- Tooltips appear on hover

---

## Completion Checklist

- [ ] All HTML structure created with semantic markup
- [ ] Complete CSS styling with responsive design
- [ ] Request profiles defined (low-io and heavy-io)
- [ ] Simulation engine correctly models GVL contention
- [ ] Rendering displays colored timeline bars
- [ ] Controls dynamically update visualization
- [ ] Edge cases handled (single thread, max threads)
- [ ] README with deployment instructions
- [ ] Deployed to GitHub Pages and verified working

## Next Steps After Completion

After implementing this plan:

1. Test with different thread counts to see GVL contention patterns
2. Consider adding more request profiles (e.g., CPU-heavy, mixed)
3. Optional enhancements:
   - Time scale ruler with millisecond markers
   - Export visualization as PNG
   - Animation mode with play/pause controls
   - Performance metrics (throughput, average wait time)

---

**Implementation Notes:**

- This is a pure frontend application with zero dependencies
- All code runs client-side, perfect for GitHub Pages
- Simulation is deterministic (same configs = same output)
- GVL is modeled simply: one holder at a time, IO releases it
- Tooltips provide detailed timing information on hover

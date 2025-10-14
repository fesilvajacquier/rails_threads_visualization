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

/**
 * Simulates concurrent thread execution with GVL contention
 * @param {Array<string>} threadConfigs - Array of profile keys (e.g., ['low-io', 'heavy-io', 'low-io'])
 * @returns {Array<Array<{state: string, startTime: number, duration: number}>>} Timeline for each thread
 */
function simulateThreads(threadConfigs) {
    // Input validation
    if (!Array.isArray(threadConfigs)) {
        throw new TypeError('threadConfigs must be an array');
    }

    if (threadConfigs.length === 0) {
        return [];
    }

    // Validate all profile keys exist
    const invalidProfiles = threadConfigs.filter(key => !REQUEST_PROFILES[key]);
    if (invalidProfiles.length > 0) {
        throw new Error(`Invalid profile key(s): ${invalidProfiles.join(', ')}. Valid profiles are: ${Object.keys(REQUEST_PROFILES).join(', ')}`);
    }

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

/**
 * Renders thread timelines as colored bar segments
 * @param {Array<Array<{state: string, startTime: number, duration: number}>>} timelines
 */
function renderVisualization(timelines) {
    // Validate timelines parameter is an array
    if (!Array.isArray(timelines)) {
        console.error('renderVisualization: timelines parameter must be an array');
        return;
    }

    // Verify DOM element exists
    const container = document.getElementById('threads-container');
    if (!container) {
        console.error('renderVisualization: threads-container element not found');
        return;
    }

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

/**
 * Generates thread configuration dropdowns based on thread count
 * @param {number} threadCount
 */
function generateThreadConfigs(threadCount) {
    const container = document.getElementById('thread-configs');
    if (!container) {
        console.error('generateThreadConfigs: thread-configs element not found');
        return;
    }
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

/**
 * Initialize application on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    const threadCountInput = document.getElementById('thread-count');
    const regenerateButton = document.getElementById('regenerate');

    if (!threadCountInput || !regenerateButton) {
        console.error('DOMContentLoaded: Required elements (thread-count or regenerate) not found');
        return;
    }

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

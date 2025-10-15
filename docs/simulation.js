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
        phaseExecutedTime: 0,  // Time actually spent executing current phase
        finished: false,
        waitingSince: null  // Track when thread started waiting for GVL (for FIFO scheduling)
    }));

    const timelines = threadConfigs.map(() => []);
    let gvlHolder = null; // Index of thread currently holding GVL, or null
    let currentTime = 0;  // Track current simulation time for FIFO wait queue

    // Simulation runs until all threads are finished
    while (threads.some(t => !t.finished)) {
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

        // Assign GVL if free and threads need it (FIFO based on wait time)
        if (gvlHolder === null) {
            let oldestWaiter = null;
            let oldestWaitTime = Infinity;

            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                if (!thread.finished) {
                    const phase = thread.profile.phases[thread.currentPhaseIndex];
                    if (phase.type === 'cpu') {
                        // Record when thread started waiting if not already tracked
                        if (thread.waitingSince === null) {
                            thread.waitingSince = currentTime;
                        }

                        // Find the thread that has been waiting the longest
                        if (thread.waitingSince < oldestWaitTime) {
                            oldestWaiter = i;
                            oldestWaitTime = thread.waitingSince;
                        }
                    }
                }
            }

            // Assign GVL to the thread that waited the longest
            if (oldestWaiter !== null) {
                gvlHolder = oldestWaiter;
                threads[oldestWaiter].waitingSince = null; // Clear wait time when granted GVL
            }
        }

        // Record state and advance execution for each thread
        threads.forEach((thread, idx) => {
            if (thread.finished) return;

            const currentPhase = thread.profile.phases[thread.currentPhaseIndex];
            let state;
            let canExecute = false;

            // Determine current state and whether thread can execute
            if (currentPhase.type === 'io') {
                state = STATE.IO;
                canExecute = true;  // IO always executes (releases GVL)
                thread.waitingSince = null;  // Clear wait time when doing IO
            } else if (currentPhase.type === 'cpu') {
                if (gvlHolder === idx) {
                    state = STATE.CPU;
                    canExecute = true;  // Has GVL, can execute
                } else {
                    state = STATE.BLOCKED;
                    canExecute = false;  // Blocked waiting for GVL
                }
            }

            // Record state in timeline
            const lastSegment = timelines[idx][timelines[idx].length - 1];
            if (lastSegment && lastSegment.state === state) {
                lastSegment.duration++;
            } else {
                timelines[idx].push({
                    state: state,
                    startTime: timelines[idx].reduce((sum, seg) => sum + seg.duration, 0),
                    duration: 1
                });
            }

            // Advance execution time only if thread can actually execute
            if (canExecute) {
                thread.phaseExecutedTime++;

                // Check if current phase is complete
                if (thread.phaseExecutedTime >= currentPhase.duration) {
                    thread.currentPhaseIndex++;
                    thread.phaseExecutedTime = 0;

                    // Check if thread finished all phases
                    if (thread.currentPhaseIndex >= thread.profile.phases.length) {
                        thread.finished = true;
                    }
                }
            }
        });

        currentTime++;  // Increment time at end of each simulation step
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

    // Find the maximum timeline duration to make bars proportional
    const maxTime = Math.max(...timelines.map(timeline =>
        timeline.reduce((sum, seg) => sum + seg.duration, 0)
    ));

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

        // Set timeline width proportional to actual duration
        timelineEl.style.width = `${(totalTime / maxTime) * 100}%`;

        // Add segments
        timeline.forEach(segment => {
            const segmentEl = document.createElement('div');
            segmentEl.className = `segment ${segment.state}`;

            // Calculate width as percentage of THIS thread's total time
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

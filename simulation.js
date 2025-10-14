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

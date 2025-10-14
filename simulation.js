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

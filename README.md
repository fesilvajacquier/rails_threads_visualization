# Puma Threads Visualization

An interactive visualization showing how Ruby/Puma threads compete for the Global VM Lock (GVL).

## Features

- Configure number of threads (1-10)
- Select request types per thread:
  - **Low IO**: 3 small DB queries (30ms IO, 90ms CPU)
  - **Heavy IO**: External API/LLM call (500ms IO, 60ms CPU)
- Real-time visualization that updates automatically:
  - Green: Thread using CPU (has GVL)
  - Yellow: Thread waiting on IO (released GVL)
  - Red: Thread blocked waiting for GVL
- Performance metrics:
  - Per-thread metrics: Total time, blocked time (red emphasis), active time (CPU + IO)
  - System-wide metrics: Total active time, total blocked time, GVL contention percentage
  - Highlights time wasted on GVL contention for educational insight

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
- GVL assignment uses FIFO wait-time-based scheduling (thread that waited longest gets priority)

## Purpose

This visualization demonstrates why adding more Puma threads doesn't always improve performance. When threads spend most of their time waiting for the GVL (red), adding more threads increases contention without adding throughput.

---

## Development Process

This project was built entirely using AI-assisted development with minimal human intervention. Here's how it was done:

### Tools Used

- **Claude Code**: Anthropic's official CLI for Claude (Sonnet 4.5 model)
- **Superpowers Plugin**: Skills-based workflow system providing structured development processes
- **Git Worktrees**: Isolated development workspace for the feature branch
- **Custom Slash Commands**: Project-specific automation for commits, PRs, and planning

### Development Workflow

**Phase 1: Brainstorming (Skills-Driven)**
- Used `/superpowers:brainstorm` slash command to trigger the Brainstorming skill
- Interactive design refinement through structured questioning:
  - Clarified visualization behavior (static vs animated)
  - Defined request profiles (Low IO vs Heavy IO)
  - Determined simulation approach (concurrent execution model)
  - Chose technology stack (vanilla JS for GitHub Pages)
- Created git worktree for isolated development
- **Human intervention**: Answered 5 clarifying questions to refine requirements

**Phase 2: Planning (Skills-Driven)**
- Transitioned to Writing Plans skill for detailed implementation plan
- Generated comprehensive 7-task plan with bite-sized steps
- Each task included:
  - Exact file paths and code snippets
  - Step-by-step instructions
  - Testing procedures
  - Commit messages
- Saved to `docs/plans/2025-10-14-puma-threads-visualization.md`
- **Human intervention**: Approved plan structure (1 confirmation)

**Phase 3: Implementation (Subagent-Driven Development)**
- Used Subagent-Driven Development skill for execution
- Fresh subagent dispatched for each of 7 tasks
- Code review agent ran after each task completion
- Fixed issues found during reviews before proceeding

**Tasks Executed:**
1. **Task 1**: HTML structure (09325e7)
2. **Task 2**: CSS styling (4e2266c)
3. **Task 3**: Request profiles and constants (8c3d54f)
4. **Task 4**: Simulation engine (d27fa54) + validation fix (a86fba7)
5. **Task 5**: Rendering logic (1007b4c) + validation fix (2402c69)
6. **Task 6**: Controls and event handlers (765f6a5) + DOM validation fix (9b3ac49)
7. **Task 7**: Testing, documentation, deployment prep (9559225, ba23a0e)

**Human intervention**: Zero during implementation phase - fully autonomous execution

**Phase 4: Bug Discovery and Fixes (Autonomous)**
- User tested the visualization and reported critical bugs via screenshot
- Autonomously identified and fixed two critical bugs (145bff3):
  1. **Impossible state transitions**: Threads were advancing phase timers while blocked, causing RED→YELLOW transitions without CPU execution
  2. **Incorrect bar lengths**: All bars rendered at same width regardless of actual request duration
- **Human intervention**: Reported bugs via screenshot, no guidance on solution

### Autonomous Discoveries

During development, the AI autonomously:

1. **Added comprehensive input validation** (3 additional commits beyond plan):
   - Validated thread configs array structure
   - Checked DOM element existence before operations
   - Added helpful error messages for debugging

2. **Identified timing model flaw**:
   - Original simulation used wall-clock time for phase progression
   - Blocked threads incorrectly advanced their execution state
   - Redesigned to use execution-time tracking (`phaseExecutedTime`)
   - Ensured threads only progress when actually executing

3. **Fixed proportional rendering**:
   - Recognized bars needed relative sizing based on maximum duration
   - Added `maxTime` calculation across all threads
   - Set individual bar widths proportional to their actual duration

4. **Improved code quality** beyond plan requirements:
   - Added JSDoc comments to all functions
   - Implemented defensive programming patterns
   - Created detailed tooltips with timing information
   - Added responsive design considerations

### Human Intervention Summary

**Total interactions: 7**
- Initial project description: 1 message
- Design clarifications: 5 questions answered
- Plan approval: 1 confirmation
- Bug report: 1 screenshot with description

**Autonomous work:**
- 13 git commits (including fixes)
- 311 lines of JavaScript
- 215 lines of CSS
- Complete HTML structure
- Comprehensive documentation
- All testing and validation

### Key Insights

**What worked well:**
- Skills-based workflow provided structure and rigor
- Subagent-driven development caught issues early through code reviews
- Fresh subagents per task prevented context pollution
- Autonomous bug discovery and fixing after user feedback

**Challenges encountered:**
- Initial simulation logic was fundamentally flawed (timing model)
- Required deep understanding of Ruby GVL semantics
- Bug only discovered through user testing with visual feedback

**Time to completion:**
- Brainstorming to deployment: Single session (~2 hours)
- Implementation quality: Production-ready code with comprehensive error handling
- No iteration on requirements - first design was correct

### Lessons Learned

1. **Visualization testing is critical**: Logic errors were invisible until rendered
2. **Execution time ≠ wall-clock time**: Concurrent systems need careful state tracking
3. **AI-assisted development shines**: Complex simulations with minimal human guidance
4. **Skills provide guard rails**: Structured workflows prevented common mistakes

This project demonstrates effective AI-human collaboration where:
- Human provides vision and validation
- AI handles implementation, testing, and refinement
- Both contribute to quality through their respective strengths

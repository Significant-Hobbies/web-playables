# Open Historia Development Skills

Reusable AI-powered development workflows using Gemini and OpenAI Codex.

## Available Skills

### 1. `add-ui-feature` (Gemini)
Adds new UI features and components to the game.

**Usage:**
```bash
./skills/add-ui-feature "Add a minimap in the bottom-right corner"
```

**What it does:**
- Reads existing component patterns
- Creates/modifies React components
- Maintains TypeScript type safety
- Follows Tailwind dark theme
- Commits changes automatically

---

### 2. `improve-ai-prompts` (OpenAI Codex)
Improves the Game Master AI prompts for better narrative quality.

**Usage:**
```bash
./skills/improve-ai-prompts "Make diplomatic interactions more realistic"
```

**What it does:**
- Analyzes current AI prompt structure
- Provides specific prompt improvements
- Maintains JSON response format
- Works across all AI providers

---

### 3. `add-game-mechanic` (Codex → Gemini Pipeline)
Designs and implements complete game mechanics using both AIs.

**Usage:**
```bash
./skills/add-game-mechanic "Add economic system with GDP and trade routes"
```

**What it does:**
- **Phase 1 (Codex):** Designs the mechanic with data structures
- **Phase 2 (Gemini):** Implements the design step-by-step
- Updates types, game state, UI, and AI prompts
- Tests and commits incrementally

---

## Setup

Make sure you have API keys set:
```bash
export OPENAI_API_KEY="your-key-here"
# Gemini uses authenticated CLI (gemini login)
```

## Examples

### Add a Victory Conditions UI
```bash
./skills/add-ui-feature "Add a victory conditions panel showing progress towards different win conditions"
```

### Improve Event System
```bash
./skills/add-game-mechanic "Add random historical events that affect nations (plagues, discoveries, revolutions)"
```

### Better Diplomacy
```bash
./skills/improve-ai-prompts "Make AI nations remember past interactions and hold grudges"
```

## Architecture

- **Gemini**: Best for autonomous implementation with tool use (reading files, editing code, git commits)
- **Codex (GPT-4)**: Best for design, prompt engineering, and planning
- **Combined**: Use Codex for design/architecture, then Gemini for implementation

## Tips

- Use `--yolo` flag with Gemini for fully autonomous execution
- Chain skills together for complex features
- Review changes before pushing to remote
- Skills auto-commit, but you can squash commits later

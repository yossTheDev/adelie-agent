# Changelog

## v0.1.2

### Added
- **Dual Operation Modes**: Implemented ask and planner modes for optimized user experience
  - **Ask Mode** (`--ask`): Direct conversation that skips planning phase, perfect for simple questions and conversations
  - **Planner Mode** (`--planner`): Full planning and execution pipeline for complex tasks requiring multiple steps
  - **Auto-detection**: Intelligent mode selection based on query complexity and action words
  - **CLI Options**: Added `--ask` and `--planner` flags for manual mode selection
- **Automatic Memory Loading System**: Complete overhaul of memory management
  - Memory loads automatically at CLI startup for immediate availability
  - Memory context automatically included in planner and response generation
  - Eliminated need for manual MEMORY_GET operations
- **Active Memory Usage**: Enhanced response system to actively use stored memory
  - Memory is automatically used to personalize responses without explicit commands
  - Updated prompts to emphasize active memory integration over internal-only usage
- **Memory Optimization**: Improved memory loading performance
  - Full memory loaded once at startup instead of per-request searches
  - Synchronous memory context retrieval for faster response generation
- **Simplified Memory Commands**: Removed MEMORY_GET from CLI and actions
  - Memory automatically available in responses - no manual retrieval needed
  - Updated CLI help to reflect automatic memory usage

### Changed
- **CLI Interface**: Enhanced with dual-mode support
  - Added `--ask` and `--planner` flags for mode selection
  - Updated help documentation to explain mode differences
  - Auto-detection logic for intelligent mode selection
- **Memory Actions**: Removed MEMORY_GET, kept SET, DELETE, CLEAR, SEARCH, LIST, STATS
- **Response Prompts**: Updated to use memory actively rather than internally
- **Planner Guidelines**: Updated to reflect automatic memory availability
- **Test Fixtures**: Updated all memory tests to remove MEMORY_GET dependencies
- **CLI Memory Commands**: Removed `memory get` command, updated help messages

### Fixed
- **Memory Loading Issues**: Resolved async/sync conflicts in memory initialization
- **Test Compatibility**: Updated all memory-related tests to work with new system
- **Documentation Alignment**: Updated examples and best practices for new memory model

## v0.1.1

### Added
- **MCP Presets + Skills System**: Complete integration of Model Context Protocol with Skills
  - 8 MCP presets: github, web-search, docs, file-index, database, pdf, shell-system, complete
  - Skills system with `.skill.md` file format and validation
  - Embedded MCP server configuration in skills (MCP Server Config section)
  - Automatic skill installation when installing MCP presets
  - CLI commands for MCP and Skills management
- **Skills Features**:
  - Template expansion with `$$input.param` variables
  - DataPiping integration with existing system
  - MCP server dependency detection and installation
  - Skill validation and caching
- **Preset Skills**: 8 pre-defined skills in `skills/presets/`:
  - `github.skill.md` - GitHub repository search
  - `web-search.skill.md` - Web search and summarization
  - `file-index.skill.md` - File search and analysis
  - `docs-retrieval.skill.md` - Web documentation fetching
  - `database-query.skill.md` - Database querying and analysis
  - `pdf-analysis.skill.md` - PDF document analysis
  - `shell-commands.skill.md` - Safe shell command execution
  - `complete-toolkit.skill.md` - Comprehensive multi-tool analysis
- **CLI Enhancements**:
  - `yi mcp install-preset <preset>` - Install MCP preset with associated skills
  - `yi skills install <file>` - Install skill with automatic MCP dependency installation
  - `yi skills list/remove/validate` - Complete skill management
- **Documentation**: Complete English documentation in `docs/SKILLS_MCP_GUIDE.md` and `docs/MCP_CONFIG_IN_SKILLS.md`

### Changed
- **Planner Integration**: Modified to load skills and inject into planning context
- **Executor**: Enhanced to handle MCP_RUN and USE_SKILL actions
- **Skill Loader**: Automatic MCP server installation and dependency management

### Fixed
- **Import errors**: Resolved duplicate imports in mcp-installer.ts
- **TypeScript errors**: Fixed type imports and lint issues
- **DataPiping in FOR_EACH**: Enhanced iteration scope for state functions

## v0.1.0

### Added
- Deterministic control-flow support improvements in executor:
  - Robust `FOR_EACH` with CSV/JSON array parsing and object/array templates
  - Embedded placeholder replacement for loop variables (`$$item`, `$$index`, `$$loopCounter`) inside strings
  - Deterministic condition evaluation for `IF` / `WHILE` using logical actions
- Extended deterministic logic/action catalog:
  - Boolean gates: `NOT`, `AND`, `OR`, `XOR`, `NAND`, `NOR`
  - Numeric comparisons: `GREATER_THAN`, `GREATER_OR_EQUALS`, `LESS_THAN`, `LESS_OR_EQUALS`
  - Numeric basics: `ADD`, `SUBTRACT`
- New core state actions:
  - `STATE_SET`
  - `STATE_CLEAR`
- New system action:
  - `SYSTEM_INFO`
- Persistent user-level agent configuration in:
  - `~/.adelie/config.json`
- Persistent MCP server registry in:
  - `~/.adelie/mcp.json`
- New CLI management commands:
  - `yi config show|set|reset|path`
  - `yi mcp list|install|remove|path`
- Exhaustive plan test harness in `plan-tests`:
  - Fixture-based execution
  - Assertions for `FOR_EACH`, `IF`, `WHILE`, and state flows

### Changed
- Planner prompt strengthened for deterministic logic-first planning.
- Planner examples are now correctly injected into planning prompt.
- Planner output is sanitized/normalized before execution:
  - Unknown actions are removed
  - Invalid/extra args are filtered
  - Control-flow args are normalized (`template`, `then/else`, `body`)
- CLI UX improved:
  - English-only runtime text
  - Rich execution plan rendering
  - Banner with active model and action count
- Runtime config is now loaded dynamically, allowing model and endpoint changes without code edits.

### Reliability
- Filesystem operations include post-operation verification for stronger determinism.
- Loop execution failure propagation improved for nested control-flow actions.
- Max loop iterations are configurable via config (`max_loop_iterations`).

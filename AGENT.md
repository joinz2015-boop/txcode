# AGENT.md

## Project Overview

- **Project Name**: tianxincode (txcode)
- **Type**: AI Coding Assistant CLI Tool
- **Core Functionality**: An interactive AI programming assistant that provides code analysis, file operations, Git integration, and multi-tool support through a command-line interface or web UI.
- **Language**: TypeScript (Node.js)

## Development Commands

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Project Structure

```
src/
├── index.ts           # Main entry point
├── cli/               # CLI commands and arguments
├── api/               # Express API routes
├── config/            # Configuration management
├── lsp/               # Language Server Protocol
└── modules/           # Core functionality modules
    ├── ai/            # AI service and providers
    ├── config/        # Config service
    ├── context/       # Context management
    ├── db/            # SQLite database
    ├── logger/        # Logging utility
    ├── memory/        # Project memory
    ├── session/       # Session management
    └── skill/         # Skill tools
```

## Key Conventions

- **TypeScript**: Full type safety required
- **ES Modules**: Uses ESM (`"type": "module"`)
- **Database**: SQLite with better-sqlite3
- **Testing**: Jest with ts-jest
- **Linting/Typecheck**: Run `npm run build` to check

## Important Notes

- The tool stores project memory in `.txcode` folder in workspace
- Supports both CLI and Web UI modes
- Configuration via web interface or environment variables
- Built-in skills for common development tasks
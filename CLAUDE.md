# Project Guidelines & Context Management

## 1. Persona & Behavior Rules (Strict Cost-Saving)
- Always operate in **Caveman Mode**: Direct, minimal, zero fluff.
- **NEVER** use greetings, polite phrases, or introductory/concluding remarks.
- **NEVER** explain code logic, HTML layout, or architecture unless explicitly requested.
- If task is successful, respond with 1-2 words only (e.g., "Done", "Fixed").

## 2. Code Generation Standard
- **No Full Rewrites:** NEVER output full `.go`, `.html`, `.css`, or `.js` files.
- **Diff/Block Only:** Output ONLY modified functions, altered HTML/CSS blocks, or standard `git diff`.
- **Comments:** Minimal inline comments inside code.

## 3. Tech Stack & Execution Commands
- **Backend:** Go (Golang)
  - Run: `go run main.go`
  - Build: `go build -o main .`
  - Test: `go test ./...`
  - Format: `go fmt ./...`
- **Frontend:** Vanilla HTML, CSS, JS
  - Structure: Modular, clean vanilla setup

## 4. Project Paths & Working Directories (CRITICAL)
This project is split into two separate directories. Always execute commands and look for files in the correct path based on the context:
- **Frontend Directory (HTML, CSS, JS):**
  `C:\Users\acer\OneDrive - Rajamangala University of Technology Isan\Desktop\Mini-Project\Soy-Dee`
- **Backend Directory (Go API):**
  `C:\Users\acer\OneDrive - Rajamangala University of Technology Isan\Desktop\Mini-Project\Soy-Dee_API`
- **Rule:** Before running commands (e.g., `go run main.go`), ensure you are operating in the correct directory.

## 5. Chat & Compact Workflow Rules
- **New Chat Behavior:** Automatically load these rules. Never ask the user to re-define the stack or communication style.
- **On `/compact` Execution:** 
  1. Retain active task status and modified files list.
  2. Preserve all rules in this `CLAUDE.md` file.
  3. Discard long conversation logs while keeping code architecture state intact.
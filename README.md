# 🪐 Orbyt: The Autonomous AI Agent

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8E75B2)

**Orbyt** is a production-grade autonomous CLI agent designed to bridge the gap between stochastic LLMs and deterministic runtime environments.

Unlike simple "chat" wrappers, Orbyt functions as a **Stateful Control Plane** for Google Gemini. It utilizes an **Event-Driven Architecture**, **Vector-Based Semantic Memory**, and **Sandboxed Execution Environments** to handle complex, multi-step engineering tasks securely. It implements the **RFC 8628 OAuth 2.0 Device Authorization Grant** for secure, headless authentication.

---

## 🏗️ Advanced System Architecture

Orbyt moves beyond a linear flow, utilizing an internal **Event Bus** to decouple the UI, Logic, and I/O layers. This ensures non-blocking streaming and modular tool scalability.

### Core Data Flow & Memory
The system creates a "Dual-Memory" architecture: **Ephemera** (Active Context Window) and **Long-Term** (Relational/Vector History).

```mermaid
graph TD
    %% Theme
    classDef core fill:#1a237e,stroke:#7986cb,stroke-width:2px,color:white;
    classDef data fill:#004d40,stroke:#4db6ac,stroke-width:2px,color:white;
    classDef ext fill:#3e2723,stroke:#a1887f,stroke-width:2px,color:white;

    User((User)) -->|Input Stream| Gateway[CLI Controller / Gateway]
    
    subgraph "The Orchestration Layer"
        Gateway -->|Emit Event| EventBus{Event Bus / PubSub}
        EventBus -->|Route Task| Planner[Recursive Planner]
        Planner -->|Next Step| ToolMgr[Tool Manager]
    end

    subgraph "Execution Plane"
        ToolMgr -->|Validation| Zod{Zod Schema}
        Zod -- Valid --> Sandbox[Sandboxed Runtime]
        Zod -- Valid --> Net[Network Interceptor]
        Sandbox -->|StdOut/StdErr| EventBus
    end

    subgraph "Memory Fabric"
        Planner <-->|Session State| RelationalDB[(PostgreSQL)]:::data
    end

    subgraph "Inference Engine"
        Planner -->|Context Window| Gemini[Google Gemini 1.5 Pro]:::ext
        Gemini -->|Function Call| Planner
    end

    EventBus -->|Stream Chunks| Gateway
    Gateway -->|Render| UI[Terminal UI]

    class Planner,EventBus,ToolMgr core
```

### The Self-Correcting Execution Loop (OODA)
Orbyt implements an OODA Loop (Observe, Orient, Decide, Act). Crucially, it includes an Abstract Syntax Tree (AST) analysis step to validate code structure before execution, preventing syntax errors from reaching the runtime.

```mermaid
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant L as LLM (Gemini)
    participant S as Sandbox (System)

    U->>O: "Refactor utils.ts to use Generics"
    
    loop OODA Cycle (Self-Healing)
        O->>L: Prompt + Context + Schema
        L-->>O: Tool Call: `write_file(content)`
        
        rect rgb(20, 20, 40)
            Note right of O: Static Analysis Phase
            O->>O: 1. Zod Schema Validation
            O->>O: 2. AST Parsing (Syntax Check)
        end
        
        alt Analysis Failed
            O->>L: Error: Syntax Error on Line 42
            Note over L: LLM patches code
        else Analysis Passed
            O->>S: Execute / Write
            S-->>O: Success / Test Results
            O->>L: Observation: "Tests Passed"
        end
    end
    O-->>U: "Refactor Complete."
```

### Secure Auth Architecture (RFC 8628)
Authentication is handled via the OAuth 2.0 Device Authorization Grant (RFC 8628), ensuring credentials never touch the file system in plain text.

```mermaid
graph TD
    classDef textOnly fill:none,stroke:none,color:#c9d1d9;

    Start(User Login):::textOnly --> User[User]
    User --> Backend[Auth Backend]
    Backend --> GenCode[Generate Device Code]

    GenCode ==> Info["1. user_code<br/>2. Verification URL"]
    Info --> InputBox[user_code]

    InputBox --> Approve[[Approve in Browser]]
    Approve --> Token[Issue Access Token]

    subgraph "Async Polling"
        direction LR
        CLI[CLI Client] -.->|Poll for Token| Backend
    end

    User ~~~ CLI
    Info ~~~ CLI
```

## Key Features
- Recursive Reasoning Loop: Implements a while(!task_complete) ReAct pattern, allowing the agent to plan, execute, observe, and correct its own actions.
- Type-Safe Tooling: Uses Zod schema validation to ensure the LLM outputs strictly typed arguments for file system operations and code execution.
- State Rehydration: "Rehydrates" conversation history from PostgreSQL on every boot, allowing for persistent context across days or weeks.
- Headless Security: Decouples authentication from the terminal using the OAuth Device Flow.
- Real-Time Web Access: Integrated Google Search tool for fetching up-to-date documentation and libraries.


## Tech Stack
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) | Core event loop and process management |
| **Inference** | Google Gemini 1.5 Pro | The reasoning engine |
| **Orchestration** | Vercel AI SDK | Tool calling and stream management |
| **Database** | PostgreSQL | Long-term vector/text storage |
| **ORM** | Prisma | Schema management and type-safe queries |
| **CLI Framework** | Commander.js | Command routing and help generation |
| **Validation** | Zod | Runtime type checking for LLM outputs |


## Installation & Setup

### Prerequisites
* **Node.js** v18+
* **PostgreSQL** (Local or Cloud)
* **Google Cloud Project** (for Gemini API)

### 1. Fork the Repository
Click the **Fork** button in the top-right corner of this page to create your own copy of the repository.

### 2. Clone Your Fork
Clone the repository from your own GitHub account:

```bash
# Replace 'YOUR_USERNAME' with your actual GitHub username
git clone https://github.com/YOUR_USERNAME/orbyt-cli.git
cd orbyt-cli
npm install
```

### 3. Environment Variables
Create a .env file in the root directory:

```bash
PORT=3005

# Database (PostgreSQL / Neon)
DATABASE_URL="postgresql://user:password@host-url/neondb?sslmode=require"

# Better Auth 
BETTER_AUTH_SECRET="your_generated_secret_here"
BETTER_AUTH_URL="http://localhost:3005"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

ALLOWED_ORIGINS="http://localhost:3000"

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY="your_google_gemini_api_key"
ORBYT_MODEL="gemini-1.5-flash"
```

### 4. Database Migration
Initialize the PostgreSQL schema:

```Bash
npx prisma migrate dev --name init
```

### 5. Link CLI
Make the orbyt command available globally:

```Bash
npm link
```

## Usage Guide

### 1. Authentication
Initialize the secure session. This command will prompt you to open your browser to authenticate via GitHub/Google.

```bash
orbyt login
```
Follow the on-screen prompt to complete the OAuth flow in your browser.

### 2. Interactive Mode (The Core)
Once logged in, wake up Orbyt to enter the main interactive menu.

```Bash
orbyt wakeup
```
You will be presented with three powerful modes:

### Chat with AI:

- Standard context-aware chat for debugging, brainstorming, and pair programming.

### Tool Calling:

- Google Search: Fetch real-time data from the web.
- Code Executor: Write and execute code safely in the local environment.
- URL Context: Scrape and analyze specific documentation URLs.

### Agent Calling:

- Fully autonomous mode. Give Orbyt a high-level goal (e.g., "Build a Todo App"), and it will plan, code, and refine the solution iteratively.

# 🪐 Orbyt: The Autonomous AI Agent

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8E75B2)

**Orbyt** is a production-grade autonomous CLI agent designed to bridge the gap between stochastic LLMs and deterministic runtime environments.

Unlike simple "chat" wrappers, Orbyt functions as a **Stateful Control Plane** for Google Gemini, capable of complex reasoning, recursive tool execution, and long-term memory via PostgreSQL. It implements the **RFC 8628 OAuth 2.0 Device Authorization Grant** for secure, headless authentication.

---

## System Architecture

Orbyt acts as a central orchestrator between the user, the AI model, and the local system. The following diagram illustrates the high-level data flow and component interaction:

```mermaid
graph TD
    User((User)) -->|Input| CLI[Orbyt CLI / Commander.js]
    CLI -->|Auth Check| OAuth[OAuth 2.0 Device Flow]
    OAuth -->|Token Exchange| GCloud[Google Cloud Auth]
    
    subgraph "The Agentic Core"
        CLI -->|Prompt + Context| Router[Intent Router]
        Router -->|Tool Call?| Validation{Zod Schema}
        
        %% Validation Logic
        Validation -->|Invalid: Error Feedback| LLM[Google Gemini 1.5]
        Validation -->|Valid: Execute| Tools[Tool Manager]
        
        Tools -->|File Ops| FS[Node.js FS]
        Tools -->|Web Query| Search[Google Search API]
        Tools -->|Code Exec| Runtime[Child Process]
    end

    subgraph "Persistence Layer"
        CLI -->|Save/Load| Prisma[Prisma ORM]
        Prisma -->|Query| Postgres[(PostgreSQL DB)]
    end

    Tools -->|Observation| LLM
    LLM -->|Final Response| CLI
```

## The Agentic Workflow (ReAct Loop)

To ensure reliability, Orbyt uses a recursive "Reason + Act" loop. It validates every AI-generated argument against a Zod Schema before execution, creating a self-healing error loop.

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent (Node.js)
    participant L as LLM (Gemini)
    participant T as Tool (System)

    U->>A: "Create a React Component"
    loop ReAct Cycle (Max 10 Iterations)
        A->>L: Send History + Available Tools
        L-->>A: Request: write_file(path, content)
        
        rect rgb(33, 33, 33)
            Note right of A: Validation Phase
            A->>A: Validate args with Zod
        end
        
        alt Arguments Invalid
            A->>L: Error: Invalid JSON format. Fix it.
            Note over L: LLM Self-Corrects
        else Arguments Valid
            A->>T: fs.writeFileSync(...)
            T-->>A: Success (File Created)
            A->>L: Tool Output: "File created successfully"
        end
    end
    L-->>U: "I have created the component."
```

## Authentication (RFC 8628)

Orbyt relies on a secure, headless authentication flow to manage user sessions without storing sensitive credentials in plain text. The specific flow for session authentication is detailed below:

```mermaid
graph TD
    %% Styling to match the dark theme
    classDef default fill:#0d1117,stroke:#c9d1d9,stroke-width:2px,color:#c9d1d9;
    classDef textOnly fill:none,stroke:none,color:#c9d1d9;

    %% Nodes
    Start(Ujjwal Login):::textOnly --> User[User]
    User --> Backend[Backend]
    Backend --> GenCode[Generate a code for CLI]

    %% Thick arrow connection
    GenCode ==> Info["1. user_code<br/>2. Verification URL"]

    Info --> InputBox[user_code]

    %% The "Approve" box has double lines in diagram
    InputBox --> Approve[[Approve]]

    Approve --> Token[Access token in json format]

    %% The center box
    subgraph " "
        direction LR
        Auth[Authenticate Session]
    end

    %% Positioning tweaks
    User ~~~ Auth
    Info ~~~ Auth
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
orbyt auth login
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

# 🪐 Orbit: The Autonomous AI Agent

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8E75B2)

**Orbit** is a production-grade autonomous CLI agent designed to bridge the gap between stochastic LLMs and deterministic runtime environments.

Unlike simple "chat" wrappers, Orbit functions as a **Stateful Control Plane** for Google Gemini, capable of complex reasoning, recursive tool execution, and long-term memory via PostgreSQL. It implements the **RFC 8628 OAuth 2.0 Device Authorization Grant** for secure, headless authentication.

---

## 🏗️ System Architecture

Orbit acts as a central orchestrator between the user, the AI model, and the local system. The following diagram illustrates the high-level data flow and component interaction:

```mermaid
graph TD
    User((User)) -->|Input| CLI[Orbit CLI / Commander.js]
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

## 🔄 The Agentic Workflow (ReAct Loop)

To ensure reliability, Orbit uses a recursive "Reason + Act" loop. It validates every AI-generated argument against a Zod Schema before execution, creating a self-healing error loop.

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

## 🔐 Authentication (RFC 8628)

Orbit relies on a secure, headless authentication flow to manage user sessions without storing sensitive credentials in plain text. The specific flow for session authentication is detailed below:

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

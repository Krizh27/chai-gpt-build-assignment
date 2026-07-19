# ChaiGPT - Advanced GenAI Chat Application

A production-grade, highly responsive AI chat application featuring continuous streaming, real-time web search tool integration, and advanced conversation branching (allowing users to explore alternate conversational paths without losing history). Built for the GenAI with JS 2026 assignment.

![Hero Banner Placehoder](#) 
*(Screenshot: Clean, responsive chat interface featuring Markdown rendering and branch selection)*

---

## Live Demo

- **Live URL:** https://chai-gpt-build-assignment.vercel.app
- **Demo Video:** [Insert YouTube Video Link Here]

---

## Features

### AI Chat & Streaming Responses
- **What it does:** Provides a real-time, ChatGPT-like conversational experience where text streams to the screen character-by-character.
- **Why it exists:** Waiting for a full LLM response causes terrible UX latency. Streaming provides immediate feedback.
- **How it works:** Leverages the Vercel AI SDK `streamText` function to process and pipe the LLM output directly into a `ReadableStream`, updating the React UI instantaneously.

### Phase 1: AI Tools (Web Search Tool Calling)
- **What it does:** Allows the AI to browse the internet for up-to-date information dynamically during a conversation.
- **Why it exists:** Standard LLMs have a knowledge cutoff. Tool calling gives the model access to real-time data.
- **How it works:** The model is provided a `webSearchTool` schema. When it decides it needs real-time data, it pauses generation, invokes the Tavily API, processes the results, and incorporates them into its final streamed answer.

### Phase 2: Chat Branching
- **What it does:** Allows users to "fork" a conversation from any specific message in the past, creating an alternate reality/branch of the conversation.
- **Why it exists:** Users frequently want to correct a prompt or explore a different line of questioning without losing their current highly-developed context.
- **How it works:** The `createBranch` Server Action duplicates the conversation history up to the selected message in the database, tying the new messages to a fresh `BranchId` while sharing the parent `ConversationId`.

### Database Persistence & Markdown Rendering
- **What it does:** Saves all conversations, branches, messages, and tool invocations securely. Renders responses beautifully with Markdown and code blocks.
- **Why it exists:** Crucial for any real-world app so users can return to past conversations.
- **How it works:** Uses Prisma as an ORM connected to PostgreSQL. The frontend parses markdown dynamically using specialized React components.

---

## Tech Stack

| Category         | Technology                                                                 |
|------------------|----------------------------------------------------------------------------|
| **Frontend**     | Next.js 14 (App Router), React, Tailwind CSS, Shadcn UI                    |
| **Backend**      | Next.js API Routes, Server Actions, Node.js                                |
| **Database**     | PostgreSQL, Prisma ORM                                                     |
| **Authentication**| Clerk                                                                      |
| **AI**           | Vercel AI SDK (`ai`, `@ai-sdk/react`)                                      |
| **Tool Calling** | Tavily API (`@tavily/core`), Zod (Schema Validation)                       |
| **Package Mgr**  | npm                                                                        |

---

## Project Architecture

```mermaid
graph TD
    User([User]) --> UI[Next.js Frontend]
    UI --> SA[Server Actions]
    UI --> API[API Route /api/chat]
    SA --> DB[(PostgreSQL via Prisma)]
    API --> SDK[Vercel AI SDK]
    SDK --> LLM[LLM Provider]
    SDK --> Tools[Web Search Tool]
    Tools --> Tavily[Tavily API]
    LLM --> Stream[Data Stream Response]
    Stream --> DB
    Stream --> UI
```

The application is built on a clean, feature-driven architecture. The frontend components rely on custom React Query hooks to interface with Server Actions for state management (like creating branches). Heavy AI compute and streaming are handled strictly via the Next.js API Route (`/api/chat`) to ensure secure execution of tools and LLM keys. 

---

## Folder Structure

```text
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
├── components/           # Reusable generic UI components (Shadcn UI, structural layout)
├── features/             # Domain-driven feature modules (The core logic)
│   ├── ai/               # AI SDK integrations, Tools (Tavily), Chat store logic
│   ├── auth/             # Clerk authentication boundaries and user sync
│   ├── conversation/     # Chat UI, Branching logic, Message rendering
│   └── home/             # Landing page / new chat logic
├── lib/                  # Global utilities, DB client instantiations
├── prisma/               # Database schema and migrations
└── public/               # Static assets (SVGs, icons)
```

### Key Architectural Decisions (Feature-Driven Design)
Instead of dumping all components into a generic `/components` folder, the codebase is modularized into `/features`. This means everything related to `conversation` (its hooks, server actions, and UI components) lives together. This ensures clean boundaries and highly maintainable code.

---

## File Responsibilities

### `app/api/chat/route.ts`
- **Purpose:** The core engine of the AI application. 
- **Role:** Handles incoming chat messages, validates the user's authentication and branch ownership, triggers the `streamText` function, processes tool calls, and pipes the final stream back to the UI. It also triggers `saveChatMessages()` when the stream naturally concludes.

### `features/conversation/actions/conversation-actions.ts`
- **Purpose:** Database operations for Chat Management.
- **Role:** Exposes highly secure Server Actions (`createBranch`, `deleteConversation`, etc.). It strictly enforces ownership via `assertOwnsConversation` before executing Prisma mutations.

### `features/ai/actions/chat-store.ts`
- **Purpose:** AI message formatting and persistence.
- **Role:** Transforms raw Prisma DB rows into the complex `UIMessage` format required by the AI SDK, and vice-versa. It handles safely persisting complex JSON payloads (like tool `metadata` and message `parts`).

### `features/conversation/components/conversation-view.tsx`
- **Purpose:** The primary Chat UI orchestrator.
- **Role:** Consumes the `useChat` hook. It manages the dropdown branch selector, renders the message feed, and passes user input down to the `ChatComposer`.

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Conversation : owns
    Conversation ||--|{ Branch : contains
    Branch ||--o{ Message : holds

    User {
        String id PK
        String clerkId UK
        String email UK
    }
    Conversation {
        String id PK
        String userId FK
        String title
    }
    Branch {
        String id PK
        String conversationId FK
        String name
        Boolean isMain
    }
    Message {
        String id PK
        String branchId FK
        Enum role
        String content
        Json parts
        Json metadata
    }
```

### Why this specific Branching Schema?
Instead of a complex "Tree" or "Linked-List" architecture where messages point to a `parentId`, this project abstracts conversational paths into distinct **Branches**. When a user forks a conversation, the backend explicitly copies the history up to that point into a new `Branch` bucket. 
- **Advantage:** Queries are blindingly fast (`WHERE branchId = X ORDER BY createdAt ASC`), completely avoiding recursive SQL CTEs.
- **Tradeoff:** Slightly higher storage cost due to duplicated messages across branches. 

---

## Request Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant APIRoute
    participant Auth
    participant DB
    participant AISDK
    participant LLM
    participant Tavily

    User->>Frontend: Types Message
    Frontend->>APIRoute: POST /api/chat
    APIRoute->>Auth: Validate Session (Clerk)
    APIRoute->>DB: Load Branch & History
    APIRoute->>DB: Persist User Message
    APIRoute->>AISDK: streamText()
    AISDK->>LLM: Send Prompt + Tools
    LLM-->>AISDK: Calls Web Search Tool
    AISDK->>Tavily: Fetch Search Results
    Tavily-->>AISDK: Return Results
    AISDK->>LLM: Send Results
    LLM-->>AISDK: Stream Answer
    AISDK-->>Frontend: toUIMessageStream()
    Frontend-->>User: Renders Markdown live
    AISDK->>DB: saveChatMessages() onEnd
```

---

## Chat Branching Flow

```mermaid
flowchart TD
    A[Message 1] --> B[Message 2]
    B --> C[Message 3]
    B -->|Branch from here| D[Create New Branch Action]
    D --> E[Prisma queries history up to Msg 2]
    E --> F[Duplicate history into New Branch]
    F --> G[Message 3 Alternate Reality]
```
The branching UX is designed to be seamless. The `useCreateBranch` mutation instantly updates the URL with the new `?branch=id`, triggering React Query to fetch the new independent history without a hard page reload.

---

## Tool Calling Flow

```mermaid
sequenceDiagram
    participant LLM
    participant AISDK as AI SDK
    participant Tool as webSearchTool
    participant Ext as Tavily API
    
    LLM->>AISDK: ToolCall (webSearch, query)
    AISDK->>Tool: execute({ query })
    Tool->>Ext: search(query)
    Ext-->>Tool: Results (JSON)
    Tool-->>AISDK: Return Answer + Links
    AISDK->>LLM: ToolResult (webSearch, Results)
    LLM-->>AISDK: Continue Generation with Context
```

---

## Streaming Architecture

By utilizing `streamText()` and `toUIMessageStream()`, the backend yields chunks of data over an HTTP stream. 
- **Why Streaming?** LLMs generate tokens sequentially. If we waited for the entire response (including the round-trip time for Tavily searches), the user might stare at a loading spinner for 5-10 seconds. Streaming reduces Time-To-First-Byte (TTFB) to milliseconds. 
- **Persistence:** Because the response is streamed directly to the client, database persistence happens asynchronously inside the `onEnd` callback of the stream wrapper.

---

## Authentication Flow

Authentication is strictly enforced via **Clerk**.
- **Middleware:** `middleware.ts` forces a login screen for unauthenticated users.
- **Server Validation:** Every single Server Action and API Route explicitly calls `await auth.protect()` and checks the database to verify the `userId` owns the `ConversationId` being modified. 

---

## Environment Variables

To run this project, you will need the following environment variables. Create a `.env` file in the root directory:

```env
# Database (PostgreSQL Connection String)
DATABASE_URL="postgresql://user:password@localhost:5432/chaigpt?schema=public"

# Clerk Authentication Keys (Get these from clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# LLM Provider Key (Assuming OpenAI for testing)
OPENAI_API_KEY="sk-..."

# Tavily Web Search API Key
TAVILY_API_KEY="tvly-..."
```

---

## Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/chai-gpt-build.git
cd chai-gpt-build
```

**2. Install dependencies**
```bash
npm install
```

**3. Setup Environment Variables**
Copy the environment variables listed above into a `.env` file at the root.

**4. Setup Database & Prisma**
Ensure your PostgreSQL instance is running.
```bash
npx prisma generate
npx prisma db push
```

**5. Start Development Server**
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

---

## Error Handling

- **Authentication Errors:** Middleware instantly redirects to Clerk. Unauthorized API calls throw `401/403`.
- **Database Errors:** Prisma throws typed errors. Missing records throw a `404` or "Conversation not found" which is caught by React Query and surfaced via `sonner` toasts.
- **Tool Failures:** If Tavily errors out, the AI SDK will fail the specific tool call gracefully, and the UI will reflect the error state in the chat window.

---

## Future Improvements

1. **Visual Branch Tree:** Implement an inline ` < 1 / 3 > ` arrow navigation system on messages to visually traverse branches rather than a top-level dropdown.
2. **Conversation Export:** Allow users to export branches to PDF or Markdown.
3. **Retrieval-Augmented Generation (RAG):** Allow users to upload PDFs and chat with their local documents alongside web search.
4. **Resiliency:** Wrap API tool calls in robust `try/catch` blocks to ensure the LLM fails gracefully if the search API goes down.

---

## Security

- **Server-Side Enforcement:** Never trust the client. Even if a user alters the `conversationId` in the frontend, the backend queries `prisma.conversation.findFirst({ where: { id, userId }})` to guarantee authorization.
- **Tool Safety:** Tool outputs are strictly parsed and formatted before being sent back to the LLM to prevent prompt injection via external web content.
- **Protected Environment:** Sensitive keys (`OPENAI_API_KEY`, `TAVILY_API_KEY`) are exclusively used in secure Node.js contexts and are never leaked to the client bundle.

---

## Lessons Learned

- **AI SDK V4 Mastery:** Learning the nuances of `streamText`, handling multiple `ToolCalls`, and mapping `UIMessage` structures drastically changed how I view asynchronous UI development.
- **Branching Architecture Tradeoffs:** Designing the branching schema taught me the delicate balance between highly-normalized "pure" SQL schemas vs. practical duplication for query performance. 
- **Next.js App Router:** Deepened understanding of combining React Server Components (RSC) for initial fast loads with Client Components (React Query) for heavy interactive mutations.

---

## License

MIT License.

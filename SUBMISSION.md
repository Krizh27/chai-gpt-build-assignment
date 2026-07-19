# ChaiGPT - Submission

## Live Demo & Video
- **Live URL:** https://chai-gpt-build-assignment.vercel.app
- **Demo Video:** [Insert YouTube Video Link Here]
- **GitHub Repository:** https://github.com/Krizh27/chai-gpt-build-assignment

---

## Phase 1: AI Tools (Web Search)
**Goal:** Allow the LLM to search the web for real-time information.

- **Integration:** Integrated the `Tavily` API as a web search tool within the Vercel AI SDK.
- **Invocation:** The model determines dynamically when a user's prompt requires recent data and invokes the `webSearchTool`.
- **Streaming:** Responses are streamed character-by-character to the UI using `streamText`.
- **Persistence:** All tool calls and their results are persisted as JSON in the database (`metadata` field on the Message model) to ensure they are rendered correctly on page reload.
- **Error Handling:** If the tool fails or the model errors out, the stream naturally handles the failure gracefully on the UI.

---

## Phase 2: Chat Branching
**Goal:** Implement conversation branching so users can continue from any previous message.

- **Branch Creation:** Users can select any previous message and click "Branch from here." This duplicates the conversation history up to that exact message into a new branch in the database.
- **Navigation & UX:** A clean dropdown selector in the chat header allows users to view all branches and seamlessly switch between different conversational realities without losing the original context.
- **Persistence:** Implemented a robust database schema using PostgreSQL + Prisma where `Conversations` have multiple `Branches`, and `Branches` hold specific `Messages`. The branch history is independently persisted and loaded.
- **State Management:** URL search parameters (`?branch=id`) are used to trigger branch switching, keeping the UI state perfectly in sync with the server.

---

## Code Quality & Architecture
- **Structure:** Feature-driven architecture (`/features/ai`, `/features/auth`, etc.) keeps code modular and maintainable rather than dumping everything in one generic folder.
- **Type Safety:** 100% strict TypeScript. Database types are generated natively by Prisma.
- **Components:** Built with reusable UI components from Shadcn UI and Tailwind CSS for rapid, consistent styling.

## User Experience (UX)
- **Responsive UI:** Fully mobile-responsive layout for both the chat interface and the sidebar navigation.
- **Markdown & Code:** The chat renders beautiful Markdown and syntax-highlighted code blocks dynamically.
- **Loading States:** Implemented smooth loading skeletons and instant optimistic UI updates when switching branches or sending messages.

## Deployment
- Successfully deployed on Vercel with PostgreSQL database integration.
- Full environment configuration is set up and functional.

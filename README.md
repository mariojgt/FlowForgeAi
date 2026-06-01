# FlowForge AI

A static visual AI workflow builder inspired by n8n, LangFlow, and Zapier.

FlowForge AI runs entirely in the browser and is designed for GitHub Pages. It lets users drag nodes onto a React Flow canvas, connect them, configure each step, execute the graph, and watch status updates as data moves through the workflow.

## Features

- React Flow canvas with drag, connect, pan, zoom, minimap, and controls
- Node library for Input, Prompt, LLM, Output, Condition, JSON Parser, and HTTP Request nodes
- Topological workflow execution with cycle prevention and node status tracking
- Mock streaming AI provider with a pluggable provider interface for future OpenAI, Anthropic, or browser AI integrations
- Bring-your-own-token model settings stored in browser `localStorage`
- OpenAI-compatible, Anthropic Claude, and Google Gemini streaming support for real LLM runs
- Save, load, rename, and delete workflows in `localStorage`
- JSON import/export plus drag-and-drop workflow import
- Shareable URL hashes for portable workflows
- Flow view and chat view, with shared links able to open directly as a chat app
- Template-based AI workflow generator
- GitHub Pages deployment via GitHub Actions

## Tech Stack

- React 19
- TypeScript
- Vite
- React Flow
- Zustand
- Tailwind CSS
- shadcn-style local UI components
- Vercel AI SDK-ready architecture

## Local Development

```bash
npm install
npm run dev
```

The app is served with a `/FlowForgeAi/` base path to match the GitHub Pages deployment URL.

## Model Tokens

Open the `Models` control in the top bar to choose OpenAI-compatible, Anthropic Claude, Google Gemini, or Mock mode. Add the API token, base URL, and default model for the selected provider. Tokens are stored only in the current browser with `localStorage`; they are never committed to the repository or exported with workflows.

The OpenAI-compatible provider uses `/chat/completions`, Anthropic uses `/messages`, and Google Gemini uses `streamGenerateContent`. Providers must allow browser requests from GitHub Pages, otherwise the request can be blocked by CORS. For production use, route model calls through a backend proxy instead of calling providers directly from the browser.

## Chat View

Use the `Flow` and `Chat` view switcher in the top bar to move between builder mode and end-user chat mode. Chat view sends each user message through the first Input node and returns the final Output node as the assistant reply. The share link preserves the selected view, so builders can send a workflow as a normal chat interface.

## Build

```bash
npm run build
```

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`, build the static app, and publish `dist` to GitHub Pages.

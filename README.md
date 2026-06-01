# FlowForge AI

A static visual AI workflow builder inspired by n8n, LangFlow, and Zapier.

FlowForge AI runs entirely in the browser and is designed for GitHub Pages. It lets users drag nodes onto a React Flow canvas, connect them, configure each step, execute the graph, and watch status updates as data moves through the workflow.

## Features

- React Flow canvas with drag, connect, pan, zoom, minimap, and controls
- Node library for Input, Prompt, LLM, Output, Condition, JSON Parser, and HTTP Request nodes
- Topological workflow execution with cycle prevention and node status tracking
- Mock streaming AI provider with a pluggable provider interface for future OpenAI, Anthropic, or browser AI integrations
- Save, load, rename, and delete workflows in `localStorage`
- JSON import/export plus drag-and-drop workflow import
- Shareable URL hashes for portable workflows
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

## Build

```bash
npm run build
```

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`, build the static app, and publish `dist` to GitHub Pages.

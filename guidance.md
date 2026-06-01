# FlowForge AI

## Overview

Build a visual AI workflow builder inspired by n8n, LangFlow, and Zapier.

The application must run entirely as a static React application deployable to GitHub Pages.

The core experience is:

1. User drags nodes onto a canvas.
2. User connects nodes together.
3. User configures each node.
4. User executes the workflow.
5. Data flows through the graph.
6. Execution is visualized in real time.
7. Workflows can be saved, loaded, exported, and shared.

---

# Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* React Flow
* Zustand
* Tailwind CSS
* shadcn/ui

## AI

* Vercel AI SDK
* Support browser-based AI providers
* Architecture should allow future OpenAI/Anthropic integration

## Storage

* localStorage
* JSON import/export

## Deployment

* GitHub Pages

No backend required for MVP.

---

# Core Features

## 1. Workflow Canvas

Create a full-screen React Flow editor.

Requirements:

* Drag nodes
* Connect nodes
* Delete nodes
* Move nodes
* Zoom
* Pan
* Minimap
* Controls

Canvas should feel similar to:

* n8n
* LangFlow
* React Flow examples

---

# 2. Node System

Implement a generic node architecture.

Each node must contain:

```ts
interface WorkflowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };

  data: {
    label: string;
    config: Record<string, any>;
  };
}
```

---

# 3. Input Node

Purpose:

Starts workflow execution.

Configuration:

```ts
{
  value: string
}
```

Output:

```ts
{
  text: string
}
```

---

# 4. Prompt Node

Purpose:

Build prompts dynamically.

Configuration:

```ts
{
  template: string
}
```

Example:

```txt
Summarize this text:

{{input}}
```

Input:

```ts
{
  input: string
}
```

Output:

```ts
{
  prompt: string
}
```

---

# 5. LLM Node

Purpose:

Run AI generation.

Configuration:

```ts
{
  model: string;
  temperature: number;
}
```

Input:

```ts
{
  prompt: string
}
```

Output:

```ts
{
  response: string
}
```

Requirements:

* Stream output
* Show loading state
* Show token animation
* Support pluggable providers

For MVP create a mock provider if browser AI is unavailable.

---

# 6. Output Node

Purpose:

Display final result.

Input:

```ts
{
  response: string
}
```

Features:

* Copy button
* Expandable panel
* Markdown rendering

---

# 7. Condition Node

Purpose:

Branch execution.

Configuration:

```ts
{
  condition: string
}
```

Example:

```txt
contains("error")
```

Outputs:

* True path
* False path

---

# 8. JSON Parser Node

Input:

```json
{
  "message": "hello"
}
```

Output:

Parsed object.

Requirements:

* Validation
* Error handling

---

# 9. HTTP Request Node

Configuration:

```ts
{
  method: string;
  url: string;
}
```

Features:

* GET
* POST

Output:

```ts
{
  status: number;
  data: any;
}
```

---

# Workflow Execution Engine

Create a graph execution engine.

Requirements:

* Topological execution
* Prevent cycles
* Execution queue
* Error handling
* Node status tracking

Node states:

```ts
idle
running
success
error
```

Visualize node state with colors.

---

# Execution Animation

When workflow runs:

Node should glow.

Example:

Input
↓
Prompt
↓
LLM
↓
Output

Animation should clearly show execution progress.

This is a major feature.

---

# Workflow Persistence

Support:

Save workflow

```json
{
  "nodes": [],
  "edges": []
}
```

Load workflow

Delete workflow

Rename workflow

Store in localStorage.

---

# Export and Import

Export:

```json
{
  "nodes": [],
  "edges": []
}
```

Import same format.

Support drag-and-drop JSON import.

---

# AI Workflow Generator

This is the flagship feature.

User enters:

"Build a workflow that summarizes Hacker News"

Application generates:

Input Node
↓
Prompt Node
↓
LLM Node
↓
Output Node

Implementation:

Generate React Flow nodes and edges from natural language.

Start with template-based generation.

Future versions can use AI SDK.

---

# Node Configuration Panel

Clicking a node opens a side panel.

Features:

* Edit label
* Edit configuration
* Validate settings
* Save changes instantly

---

# UI Layout

Top Bar

Contains:

* Save
* Load
* Run Workflow
* Export
* Import

Left Sidebar

Contains:

* Node library

Center

Contains:

* React Flow canvas

Right Sidebar

Contains:

* Node settings

Bottom Panel

Contains:

* Execution logs

---

# MVP Deliverables

Version 1 must include:

✅ React Flow canvas

✅ Input Node

✅ Prompt Node

✅ LLM Node

✅ Output Node

✅ Workflow execution

✅ Save/load

✅ Import/export

✅ Execution animation

✅ GitHub Pages deployment

---

# Stretch Goals

1. Loop node

2. Agent node

3. Multi-agent workflows

4. Browser AI models

5. Shareable URLs

6. Real-time collaboration

7. Workflow marketplace

8. Workflow version history

9. Workflow debugging mode

10. LangGraph compatibility

---

# Portfolio Requirements

The application should look polished enough that a recruiter can understand it in under 30 seconds.

Prioritize:

* Excellent UX
* Smooth animations
* Clean node design
* Professional dashboard appearance

The final project should feel like a lightweight version of n8n or LangFlow rather than a tutorial project.

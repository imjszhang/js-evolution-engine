# Host Adapter Guide

The `HostContext` is the single integration interface between `js-evolution-engine` and the application that embeds it. Every field is optional; the engine degrades gracefully when adapters are missing.

## Contract

```typescript
type HostContext = {
  // Where runtime data lives. Defaults to process.cwd().
  basePath?: string;

  // Display name used in log prefixes and (if set) notification titles.
  appName?: string;

  // Logging — info / warning / error methods.
  logger?: { info(msg): void; warning(msg): void; error(msg): void };

  // Notifications (e.g. Slack, email, IM). Optional.
  notifier?: {
    sendMessage(content: string, title?: string): void | Promise<void>;
    sendErrorAlert?(content: string, opts?: object): void | Promise<void>;
  };

  // Knowledge / intelligence storage adapters. Optional.
  intelligenceStore?: object;     // any object the host wants to inject
  knowledgeWriter?: {             // optional; used by engine to enrich prompt context
    buildContextSummary(): string;
  };
  analyticsReader?: {             // optional; consulted by SelfAnalyzer
    generateAnalysisForOada(days: number): object;
  };

  // Domain API client (your business client; passed through to action handlers as ctx.client).
  client?: object;

  // Action dispatch — keyed by `action.type`.
  actionHandlers?: Record<string, (action, ctx) => Promise<Result> | Result>;

  // Custom verifiers (verify pipeline / verifyActions helper).
  actionVerifiers?: Record<string, { verify(action, result, ctx): VerificationItem }>;

  // GitHub integration (optional — required only for github-mode pipelines).
  githubIssues?: GitHubIssueManager;
};
```

The `oada` CLI loads a `HostContext` factory from `oada.config.mjs`:

```javascript
// oada.config.mjs
export default async function ({ cwd }) {
  return {
    aiClient,        // required
    host,            // required (or omitted = NULL_HOST)
    actionRegistry,  // optional
    promptBuilder,   // optional
    githubIssues,    // optional
  };
}
```

## Action handler contract

```javascript
const handlers = {
  send_email: async (action, ctx) => {
    // action: { type, description, params, priority, serves_goal, ... }
    // ctx:    { projectRoot, cycleId, modifier, ai, featureQueue, host, client, logger, goalsText }
    await ctx.client.email.send(action.params);
    return {
      success: true,
      message: 'sent',
      created_files: [],     // optional — used by generic file-verifier
      modified_files: [],    // optional
    };
  },
};
```

Handler return values:
- `{ success: true, ... }` — decision is marked completed.
- `{ success: false, error: '...', deferred: true }` — decision is released back to `pending` (will be retried).
- `{ success: false, error: '...' }` — decision is marked failed.

## Custom AI client

Subclass `BaseAIClient` and implement `_chatRaw`:

```javascript
import { BaseAIClient } from 'js-evolution-engine';

class OpenAIClient extends BaseAIClient {
  constructor(opts) { super(opts); this.apiKey = opts.apiKey; }
  async _chatRaw(message, { thinking, timeout }) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
      }),
      signal: AbortSignal.timeout(timeout * 1000),
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
  }
}
```

`BaseAIClient` already provides robust JSON extraction (`chatJson`) that handles markdown fences, trailing commas, and partial responses.

## Custom prompts

```javascript
import { PromptBuilder } from 'js-evolution-engine';

const promptBuilder = new PromptBuilder({
  overrides: {
    'analyze-decide': readFileSync('./my-prompts/analyze-decide.md', 'utf-8'),
  },
});
```

Available template keys: `analyze-decide`, `analyze`, `decide`, `feature-design`, `feature-impl`. See [`src/ai/prompts/`](../src/ai/prompts) for the default templates and the placeholder tokens (`{{GOALS_SECTION}}`, `{{ACTION_REGISTRY}}`, etc.).

## Registering domain action types

```javascript
import { ACTION_REGISTRY, ActionTypeSpec } from 'js-evolution-engine';

ACTION_REGISTRY.register(new ActionTypeSpec({
  name: 'rotate_secret',
  description: 'Rotate an API secret',
  promptHint: 'Rotate an API secret (params: service, secret_name)',
  defaultRisk: 'high',
  autoExecutable: false,   // requires manual approval
}));
```

Action types control:
- The list shown to the AI in the analyze-decide prompt (`{{ACTION_REGISTRY}}`).
- The default risk level used by the verify pipeline's policy mapping.
- Whether the action is candidate for auto-execution vs. routed to a human reviewer.

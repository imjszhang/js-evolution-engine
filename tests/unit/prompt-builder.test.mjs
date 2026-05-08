import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '../../src/ai/prompt-builder.mjs';

describe('PromptBuilder.agentContextDocs', () => {
  const pb = new PromptBuilder();

  it('omits the section when no docs are provided', () => {
    const out = pb.buildAnalysisDecisionPrompt({}, {});
    expect(out).not.toContain('Agent Context Documents');
    expect(out).not.toContain('{{AGENT_CONTEXT_DOCS}}');
  });

  it('omits the section when docs is an empty array', () => {
    const out = pb.buildAnalysisDecisionPrompt({}, { agentContextDocs: [] });
    expect(out).not.toContain('Agent Context Documents');
  });

  it('injects multiple docs verbatim, preserving order, id, and source', () => {
    const docs = [
      {
        id: 'proto:constitution',
        source: 'CONSTITUTION.md v1.0.0',
        text: '# Constitution\n\nLine A unique-marker-AAA.\n',
      },
      {
        id: 'proto:skill',
        source: 'SKILL.md v2.0.0',
        text: '# Skill\n\nLine B unique-marker-BBB.\n',
      },
    ];
    const out = pb.buildAnalysisDecisionPrompt({}, { agentContextDocs: docs });

    expect(out).toContain('Agent Context Documents');
    expect(out).toContain('### Document: proto:constitution');
    expect(out).toContain('source: CONSTITUTION.md v1.0.0');
    expect(out).toContain('unique-marker-AAA');
    expect(out).toContain('### Document: proto:skill');
    expect(out).toContain('source: SKILL.md v2.0.0');
    expect(out).toContain('unique-marker-BBB');

    // Order preserved: AAA must appear before BBB.
    const idxA = out.indexOf('unique-marker-AAA');
    const idxB = out.indexOf('unique-marker-BBB');
    expect(idxA).toBeGreaterThan(-1);
    expect(idxB).toBeGreaterThan(idxA);

    // Section sits ahead of the standard role header.
    expect(out.indexOf('Agent Context Documents'))
      .toBeLessThan(out.indexOf('Strategic Analysis & Decision'));
  });

  it('handles docs without a source label', () => {
    const out = pb.buildAnalysisDecisionPrompt({}, {
      agentContextDocs: [{ id: 'no-source', text: 'plain text body' }],
    });
    expect(out).toContain('### Document: no-source');
    expect(out).not.toContain('(source:');
    expect(out).toContain('plain text body');
  });

  it('also injects into buildAnalysisPrompt and buildDecisionPrompt', () => {
    const docs = [{ id: 'p:c', source: 's', text: 'visible-in-both' }];

    const a = pb.buildAnalysisPrompt({}, { agentContextDocs: docs });
    expect(a).toContain('Agent Context Documents');
    expect(a).toContain('visible-in-both');

    const d = pb.buildDecisionPrompt({}, { agentContextDocs: docs });
    expect(d).toContain('Agent Context Documents');
    expect(d).toContain('visible-in-both');
  });
});

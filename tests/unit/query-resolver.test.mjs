import { describe, it, expect } from 'vitest';
import { ObservationSourceRegistry, ObservationSourceSpec } from '../../src/observe/observation-registry.mjs';
import { QueryResolver } from '../../src/observe/query-resolver.mjs';

function buildRegistry() {
  const reg = new ObservationSourceRegistry({ includeBuiltins: false });
  reg.register(new ObservationSourceSpec({
    id: 'inbox', description: 'incoming messages', sourceType: 'api', collector: 'c',
    cost: 'low', tags: ['inbox', 'mail', 'messages'],
  }));
  reg.register(new ObservationSourceSpec({
    id: 'metrics', description: 'service metrics', sourceType: 'api', collector: 'c',
    cost: 'medium', tags: ['metrics', 'latency', 'errors', 'reliability'],
  }));
  reg.register(new ObservationSourceSpec({
    id: 'metrics_slow', description: 'slow detailed metrics', sourceType: 'api', collector: 'c',
    cost: 'high', tags: ['metrics', 'detailed', 'reliability'],
    overlapsWith: ['metrics'],
  }));
  return reg;
}

describe('QueryResolver', () => {
  it('matches questions to sources by tag intersection', () => {
    const reg = buildRegistry();
    const resolver = new QueryResolver(reg);
    const plan = resolver.resolve([
      { question: 'How many new mail messages today?', priority: 'medium' },
      { question: 'What are the latency and errors trends?', priority: 'high' },
    ]);
    expect(plan.sources).toContain('inbox');
    expect(plan.sources).toContain('metrics');
  });

  it('flags unresolvable questions in the unresolved list', () => {
    const reg = buildRegistry();
    const resolver = new QueryResolver(reg);
    const plan = resolver.resolve([
      { question: 'When does the universe end?' },
    ]);
    expect(plan.unresolved.length).toBe(1);
    expect(plan.sources).toEqual([]);
  });

  it('deduplicates overlapping sources, preferring lower cost', () => {
    const reg = buildRegistry();
    const resolver = new QueryResolver(reg);
    const plan = resolver.resolve([
      { question: 'detailed metrics on reliability errors latency please' },
    ]);
    expect(plan.sources).toContain('metrics');
    expect(plan.sources).not.toContain('metrics_slow');
  });

  it('infers depth from question count and priority mix', () => {
    const reg = buildRegistry();
    const resolver = new QueryResolver(reg);
    const surface = resolver.resolve([{ question: 'mail?' }]);
    expect(surface.depth).toBe('surface');
    const standard = resolver.resolve([
      { question: 'mail?', priority: 'high' },
    ]);
    expect(standard.depth).toBe('standard');
    const deep = resolver.resolve([
      { question: 'mail?', priority: 'high' },
      { question: 'errors?', priority: 'high' },
      { question: 'latency?', priority: 'high' },
    ]);
    expect(deep.depth).toBe('deep');
  });
});

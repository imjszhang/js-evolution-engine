import { describe, it, expect } from 'vitest';
import { ObservationSourceRegistry, ObservationSourceSpec, OBSERVATION_REGISTRY } from '../../src/observe/observation-registry.mjs';

describe('ObservationSourceRegistry', () => {
  it('ships with framework-internal builtins only', () => {
    expect(OBSERVATION_REGISTRY.has('execution_logs')).toBe(true);
    expect(OBSERVATION_REGISTRY.has('evolution_history')).toBe(true);
    expect(OBSERVATION_REGISTRY.has('feature_requests')).toBe(true);
    expect(OBSERVATION_REGISTRY.has('human_guidance')).toBe(true);
  });

  it('register adds a host source and toAiSourceList exposes it', () => {
    const reg = new ObservationSourceRegistry({ includeBuiltins: false });
    reg.register(new ObservationSourceSpec({
      id: 'inbox',
      description: 'incoming messages',
      sourceType: 'api',
      collector: '_collectInbox',
      cost: 'low',
      tags: ['mail', 'inbox', 'messages'],
    }));
    const list = reg.toAiSourceList();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'inbox', description: 'incoming messages', type: 'api', cost: 'low',
    });
    expect(list[0].tags).toContain('inbox');
  });

  it('rejects invalid sourceType and cost', () => {
    const reg = new ObservationSourceRegistry({ includeBuiltins: false });
    expect(() => reg.register(new ObservationSourceSpec({
      id: 'x', description: 'd', sourceType: 'magic', collector: 'c',
    }))).toThrow(/Invalid sourceType/);
    expect(() => reg.register(new ObservationSourceSpec({
      id: 'x', description: 'd', sourceType: 'api', collector: 'c', cost: 'huge',
    }))).toThrow(/Invalid cost/);
  });

  it('listAvailable filters out unavailable sources', () => {
    const reg = new ObservationSourceRegistry({ includeBuiltins: false });
    reg.register(new ObservationSourceSpec({
      id: 'a', description: 'd', sourceType: 'api', collector: 'c',
    }));
    reg.register(new ObservationSourceSpec({
      id: 'b', description: 'd', sourceType: 'api', collector: 'c', available: false,
    }));
    expect(reg.listAvailable().map(s => s.id)).toEqual(['a']);
    expect(reg.toAiSourceList().map(s => s.id)).toEqual(['a']);
  });

  it('mergeIntelligenceSources adds intelligence-flagged entries', () => {
    const reg = new ObservationSourceRegistry({ includeBuiltins: false });
    const fakeIntel = {
      listAll: () => [
        { description: 'agent profiles', getObserverId: () => 'intelligence_agents' },
      ],
    };
    reg.mergeIntelligenceSources(fakeIntel);
    expect(reg.has('intelligence_agents')).toBe(true);
    const spec = reg.get('intelligence_agents');
    expect(spec.sourceType).toBe('intelligence');
    expect(spec.tags).toContain('agents');
  });
});

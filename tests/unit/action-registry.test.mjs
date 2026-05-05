import { describe, it, expect } from 'vitest';
import { ActionTypeRegistry, ActionTypeSpec, ACTION_REGISTRY } from '../../src/decide/action-registry.mjs';

describe('ActionTypeRegistry', () => {
  it('ships with builtin generic action types', () => {
    expect(ACTION_REGISTRY.size).toBeGreaterThan(0);
    expect(ACTION_REGISTRY.has('implement_feature')).toBe(true);
    expect(ACTION_REGISTRY.has('fix_reliability')).toBe(true);
  });

  it('register adds a new spec and rejects invalid risk', () => {
    const reg = new ActionTypeRegistry();
    reg.register(new ActionTypeSpec({
      name: 'send_email', description: 'send email',
      promptHint: 'send an email', defaultRisk: 'medium',
    }));
    expect(reg.has('send_email')).toBe(true);
    expect(reg.get('send_email').defaultRisk).toBe('medium');

    expect(() => reg.register(new ActionTypeSpec({
      name: 'bad', description: 'd', promptHint: 'p', defaultRisk: 'critical',
    }))).toThrow(/Invalid defaultRisk/);
  });

  it('toLabelMapping / toReverseLabelMapping produce inverse maps', () => {
    const reg = new ActionTypeRegistry({ includeBuiltins: false });
    reg.register(new ActionTypeSpec({ name: 'foo_bar', description: 'd', promptHint: 'p' }));
    const fwd = reg.toLabelMapping();
    const rev = reg.toReverseLabelMapping();
    expect(fwd.foo_bar).toBe('type/foo-bar');
    expect(rev['type/foo-bar']).toBe('foo_bar');
  });

  it('toPromptSection enumerates registered types as prompt lines', () => {
    const reg = new ActionTypeRegistry({ includeBuiltins: false });
    reg.register(new ActionTypeSpec({ name: 'a1', description: 'd', promptHint: 'hint A' }));
    reg.register(new ActionTypeSpec({ name: 'a2', description: 'd', promptHint: 'hint B' }));
    const text = reg.toPromptSection();
    expect(text).toContain('`a1`: hint A');
    expect(text).toContain('`a2`: hint B');
  });

  it('autoExecutableNames vs skippedNames split by autoExecutable flag', () => {
    const reg = new ActionTypeRegistry({ includeBuiltins: false });
    reg.register(new ActionTypeSpec({ name: 'auto', description: 'd', promptHint: 'p', autoExecutable: true }));
    reg.register(new ActionTypeSpec({ name: 'manual', description: 'd', promptHint: 'p', autoExecutable: false }));
    expect([...reg.autoExecutableNames()]).toEqual(['auto']);
    expect([...reg.skippedNames()]).toEqual(['manual']);
  });
});

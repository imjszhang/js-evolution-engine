import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DecisionQueue, STATUS_PENDING, STATUS_COMPLETED, STATUS_FAILED, STATUS_IN_PROGRESS,
} from '../../src/decide/decision-queue.mjs';

let tmp;
let queue;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'oada-dq-'));
  queue = new DecisionQueue({ dataDir: tmp });
});

afterEach(() => {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
});

describe('DecisionQueue', () => {
  it('persists added decisions to pending_decisions.json', () => {
    const ids = queue.addDecisions({
      cycleId: 'cycle-1',
      actions: [{ type: 'a' }, { type: 'b' }],
    });
    expect(ids).toEqual(['cycle-1:0', 'cycle-1:1']);
    expect(existsSync(join(tmp, 'pending_decisions.json'))).toBe(true);
    const raw = JSON.parse(readFileSync(join(tmp, 'pending_decisions.json'), 'utf-8'));
    expect(raw.decisions).toHaveLength(2);
    expect(raw.decisions[0].status).toBe(STATUS_PENDING);
  });

  it('claimNext moves decisions to in_progress (newest first)', async () => {
    queue.addDecisions({ cycleId: 'cycle-old', actions: [{ type: 'a' }] });
    await new Promise(r => setTimeout(r, 5));
    queue.addDecisions({ cycleId: 'cycle-new', actions: [{ type: 'b' }] });

    const claimed = queue.claimNext(1);
    expect(claimed).toHaveLength(1);
    expect(claimed[0].cycle_id).toBe('cycle-new');
    expect(claimed[0].status).toBe(STATUS_IN_PROGRESS);

    const pending = queue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].cycle_id).toBe('cycle-old');
  });

  it('completeDecision and failDecision update status', () => {
    queue.addDecisions({ cycleId: 'c', actions: [{ type: 'a' }, { type: 'b' }] });
    queue.completeDecision('c:0', 'done');
    queue.failDecision('c:1', 'boom');

    const all = queue.getAll();
    const a0 = all.find(d => d.id === 'c:0');
    const a1 = all.find(d => d.id === 'c:1');
    expect(a0.status).toBe(STATUS_COMPLETED);
    expect(a0.result_summary).toBe('done');
    expect(a1.status).toBe(STATUS_FAILED);
    expect(a1.error).toBe('boom');
  });

  it('getSummary counts by status', () => {
    queue.addDecisions({ cycleId: 'c', actions: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] });
    queue.completeDecision('c:0');
    queue.failDecision('c:1', 'oops');
    const sum = queue.getSummary();
    expect(sum.total).toBe(3);
    expect(sum.by_status.completed).toBe(1);
    expect(sum.by_status.failed).toBe(1);
    expect(sum.by_status.pending).toBe(1);
  });

  it('cleanupExpired marks old pending as expired', () => {
    queue.addDecisions({ cycleId: 'c', actions: [{ type: 'a' }] });
    const file = join(tmp, 'pending_decisions.json');
    const raw = JSON.parse(readFileSync(file, 'utf-8'));
    raw.decisions[0].created_at = new Date(Date.now() - 100 * 3600000).toISOString();
    writeFileSync(file, JSON.stringify(raw), 'utf-8');

    queue.cleanupExpired(72);
    const all = queue.getAll();
    expect(all[0].status).toBe('expired');
  });
});

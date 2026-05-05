/**
 * Decision Queue — decoupling interface between intel and exec pipelines.
 *
 * Persisted to data/evolution/pending_decisions.json.
 * Uses proper-lockfile for concurrent access safety.
 *
 * Status flow: pending → in_progress → completed / failed / expired
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import lockfile from 'proper-lockfile';
import { isoBeijing } from '../core/time.mjs';

const STATUS_PENDING = 'pending';
const STATUS_IN_PROGRESS = 'in_progress';
const STATUS_COMPLETED = 'completed';
const STATUS_FAILED = 'failed';
const STATUS_EXPIRED = 'expired';
const TERMINAL_STATUSES = new Set([STATUS_COMPLETED, STATUS_FAILED, STATUS_EXPIRED]);

export { STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_COMPLETED, STATUS_FAILED, STATUS_EXPIRED };

export class DecisionQueue {
  /**
   * @param {object} [opts]
   * @param {string} [opts.dataDir]
   * @param {Function} [opts.logFn]
   */
  constructor({ dataDir, logFn } = {}) {
    this.dataDir = dataDir || join(process.cwd(), 'data', 'evolution');
    mkdirSync(this.dataDir, { recursive: true });
    this._filePath = join(this.dataDir, 'pending_decisions.json');
    this._logFn = logFn || (() => {});
  }

  _log(message, level = 'info') { this._logFn(message, { level }); }

  _withLock(fn) {
    mkdirSync(dirname(this._filePath), { recursive: true });
    if (!existsSync(this._filePath)) {
      writeFileSync(this._filePath, JSON.stringify({ decisions: [] }), 'utf-8');
    }
    let release;
    try {
      release = lockfile.lockSync(this._filePath, { retries: { retries: 5, minTimeout: 100 } });
    } catch {
      return fn();
    }
    try {
      return fn();
    } finally {
      try { release(); } catch {}
    }
  }

  _readAll() {
    if (!existsSync(this._filePath)) return { decisions: [] };
    try {
      const data = JSON.parse(readFileSync(this._filePath, 'utf-8'));
      if (!data || !Array.isArray(data.decisions)) return { decisions: [] };
      return data;
    } catch { return { decisions: [] }; }
  }

  _writeAll(data) {
    data.updated_at = isoBeijing();
    const tmp = this._filePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmp, this._filePath);
  }

  /**
   * @param {object} opts
   * @param {string} opts.cycleId
   * @param {object[]} opts.actions
   * @param {string} [opts.analysisContext]
   * @returns {string[]}
   */
  addDecisions({ cycleId, actions, analysisContext = '' }) {
    const now = isoBeijing();
    /** @type {string[]} */
    const newIds = [];

    this._withLock(() => {
      const data = this._readAll();
      for (let idx = 0; idx < actions.length; idx++) {
        const decisionId = `${cycleId}:${idx}`;
        data.decisions.push({
          id: decisionId, cycle_id: cycleId, created_at: now,
          status: STATUS_PENDING, action: actions[idx],
          analysis_context: (analysisContext || '').slice(0, 3000),
        });
        newIds.push(decisionId);
      }
      this._writeAll(data);
      this._log(`Added ${newIds.length} decision(s) to queue (cycle=${cycleId})`);
    });
    return newIds;
  }

  getPending() {
    return this._withLock(() => {
      const data = this._readAll();
      return data.decisions.filter(d => d.status === STATUS_PENDING);
    });
  }

  getAll() {
    return this._withLock(() => this._readAll().decisions);
  }

  getSummary() {
    return this._withLock(() => {
      const data = this._readAll();
      /** @type {Record<string, number>} */
      const byStatus = {};
      for (const d of data.decisions) {
        const s = d.status || 'unknown';
        byStatus[s] = (byStatus[s] || 0) + 1;
      }
      return { total: data.decisions.length, by_status: byStatus };
    });
  }

  /**
   * @param {string} decisionId
   * @param {string} status
   * @param {string} [error]
   */
  updateStatus(decisionId, status, error = null) {
    this._withLock(() => {
      const data = this._readAll();
      const now = isoBeijing();
      for (const d of data.decisions) {
        if (d.id === decisionId) {
          d.status = status;
          d.status_updated_at = now;
          if (error) d.error = error;
          break;
        }
      }
      this._writeAll(data);
      this._log(`Decision status updated: ${decisionId} -> ${status}`);
    });
  }

  /** @param {number} [limit] */
  claimNext(limit = 1) {
    return this._withLock(() => {
      const data = this._readAll();
      const now = isoBeijing();
      const pending = data.decisions
        .filter(d => d.status === STATUS_PENDING)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      const claimed = [];
      for (const d of pending.slice(0, limit)) {
        d.status = STATUS_IN_PROGRESS;
        d.status_updated_at = now;
        claimed.push(d);
      }
      if (claimed.length) {
        this._writeAll(data);
        this._log(`Claimed ${claimed.length} decision(s)`);
      }
      return claimed;
    });
  }

  /** @param {string} decisionId @param {string} [resultSummary] */
  completeDecision(decisionId, resultSummary = '') {
    this._withLock(() => {
      const data = this._readAll();
      const now = isoBeijing();
      for (const d of data.decisions) {
        if (d.id === decisionId) {
          d.status = STATUS_COMPLETED;
          d.status_updated_at = now;
          if (resultSummary) d.result_summary = resultSummary.slice(0, 2000);
          break;
        }
      }
      this._writeAll(data);
      this._log(`Decision completed: ${decisionId}`);
    });
  }

  /** @param {string} decisionId @param {string} [error] */
  failDecision(decisionId, error = '') {
    this._withLock(() => {
      const data = this._readAll();
      const now = isoBeijing();
      for (const d of data.decisions) {
        if (d.id === decisionId) {
          d.status = STATUS_FAILED;
          d.status_updated_at = now;
          if (error) d.error = error.slice(0, 2000);
          break;
        }
      }
      this._writeAll(data);
      this._log(`Decision failed: ${decisionId}`);
    });
  }

  /** @param {string} decisionId */
  getById(decisionId) {
    return this._withLock(() => {
      const data = this._readAll();
      return data.decisions.find(d => d.id === decisionId) || null;
    });
  }

  /** @param {number} [maxAgeHours] */
  cleanupExpired(maxAgeHours = 72) {
    this._withLock(() => {
      const data = this._readAll();
      const now = Date.now();
      const cutoff = now - maxAgeHours * 3600000;
      const cleanupCutoff = now - 7 * 86400000;

      let expiredCount = 0;
      const kept = [];
      for (const d of data.decisions) {
        const created = d.created_at || '';
        const status = d.status || '';

        if (status === STATUS_PENDING && created) {
          try {
            if (new Date(created).getTime() < cutoff) {
              d.status = STATUS_EXPIRED;
              d.status_updated_at = isoBeijing();
              expiredCount++;
            }
          } catch {}
        }

        if (TERMINAL_STATUSES.has(d.status) && created) {
          try {
            if (new Date(created).getTime() < cleanupCutoff) continue;
          } catch {}
        }
        kept.push(d);
      }

      const removed = data.decisions.length - kept.length;
      data.decisions = kept;
      if (expiredCount > 0 || removed > 0) {
        this._writeAll(data);
        this._log(`Queue cleanup: ${expiredCount} expired, ${removed} removed`);
      }
    });
  }
}

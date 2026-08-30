import { describe, expect, it } from 'vitest';
import { decideRemoteChange } from './sync-service';

describe('decideRemoteChange', () => {
  it('pulls remote when there is no local copy yet', () => {
    expect(decideRemoteChange(undefined, '2024-01-02T00:00:00.000Z')).toBe('pull_remote');
  });

  it('does nothing when the remote timestamp matches what we last synced', () => {
    const local = { syncStatus: 'synced', driveModifiedTime: '2024-01-01T00:00:00.000Z' };
    expect(decideRemoteChange(local, '2024-01-01T00:00:00.000Z')).toBe('noop');
  });

  it('pulls remote when local has no pending edits', () => {
    const local = { syncStatus: 'synced', driveModifiedTime: '2024-01-01T00:00:00.000Z' };
    expect(decideRemoteChange(local, '2024-01-02T00:00:00.000Z')).toBe('pull_remote');
  });

  it('keeps both copies when local has unsynced edits and Drive also changed', () => {
    const local = { syncStatus: 'pending', driveModifiedTime: '2024-01-01T00:00:00.000Z' };
    expect(decideRemoteChange(local, '2024-01-02T00:00:00.000Z')).toBe('keep_both');
  });
});

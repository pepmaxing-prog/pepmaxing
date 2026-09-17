import { LocalRepository, type KeyValueStore } from '@/data/local-repository';
import type { ShotDraft } from '@/data/types';

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
}

function draft(overrides: Partial<ShotDraft> = {}): ShotDraft {
  return {
    medicationId: 'semaglutide',
    date: '2026-01-01',
    time: '08:00',
    dosageAmount: 1,
    dosageUnit: 'mg',
    injectionSite: 'abdomenLeft',
    painLevel: 2,
    notes: '',
    ...overrides,
  };
}

describe('LocalRepository', () => {
  it('starts empty', async () => {
    const data = await new LocalRepository(new MemoryStore()).load();
    expect(data.shots).toEqual([]);
    expect(data.subscription.status).toBe('none');
    expect(data.onboarding.completed).toBe(false);
  });

  it('persists shots across instances, newest first', async () => {
    const storage = new MemoryStore();
    const repo = new LocalRepository(storage);
    await repo.addShot(draft({ date: '2026-01-01' }));
    await repo.addShot(draft({ date: '2026-01-08' }));

    const reloaded = await new LocalRepository(storage).load();
    expect(reloaded.shots.map((shot) => shot.date)).toEqual(['2026-01-08', '2026-01-01']);
  });

  it('updates and deletes shots', async () => {
    const repo = new LocalRepository(new MemoryStore());
    const shot = await repo.addShot(draft());
    const updated = await repo.updateShot(shot.id, { dosageAmount: 2.4, notes: 'titrated' });
    expect(updated?.dosageAmount).toBe(2.4);
    expect(updated?.notes).toBe('titrated');

    await repo.deleteShot(shot.id);
    expect((await repo.load()).shots).toEqual([]);
    expect(await repo.updateShot('missing', { notes: 'x' })).toBeNull();
  });

  it('stores measurements newest first', async () => {
    const repo = new LocalRepository(new MemoryStore());
    await repo.addMeasurement({ type: 'weight', value: 90, unit: 'kg', timestamp: '2026-01-01T08:00:00.000Z' });
    const second = await repo.addMeasurement({
      type: 'weight',
      value: 88,
      unit: 'kg',
      timestamp: '2026-02-01T08:00:00.000Z',
    });
    expect((await repo.load()).measurements[0].id).toBe(second.id);

    await repo.deleteMeasurement(second.id);
    expect((await repo.load()).measurements).toHaveLength(1);
  });

  it('recovers from corrupt storage instead of throwing', async () => {
    const storage = new MemoryStore();
    await storage.setItem('pepmaxing.appdata.v1', '{not json');
    expect((await new LocalRepository(storage).load()).shots).toEqual([]);
  });

  it('backfills fields missing from an older payload', async () => {
    const storage = new MemoryStore();
    await storage.setItem('pepmaxing.appdata.v1', JSON.stringify({ shots: [] }));
    const data = await new LocalRepository(storage).load();
    expect(data.subscription).toEqual({ status: 'none', plan: null, expiresAt: null });
    expect(data.onboarding.answers.goal).toBeNull();
  });

  it('keeps stored answers while adding newer answer keys', async () => {
    const storage = new MemoryStore();
    await storage.setItem(
      'pepmaxing.appdata.v1',
      JSON.stringify({ onboarding: { completed: true, answers: { goal: 'loseFat' } } }),
    );
    const data = await new LocalRepository(storage).load();
    expect(data.onboarding.completed).toBe(true);
    expect(data.onboarding.answers.goal).toBe('loseFat');
    expect(data.onboarding.answers.cadence).toBeNull();
  });

  it('clears everything on reset', async () => {
    const storage = new MemoryStore();
    const repo = new LocalRepository(storage);
    await repo.addShot(draft());
    await repo.reset();
    expect((await repo.load()).shots).toEqual([]);
    expect(storage.map.size).toBe(0);
  });
});

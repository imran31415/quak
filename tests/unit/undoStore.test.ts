import { describe, it, expect, beforeEach } from 'vitest';
import { useUndoStore } from '@client/store/undoStore';
import type { UndoAction } from '@client/store/undoStore';

describe('undoStore', () => {
  beforeEach(() => {
    useUndoStore.getState().clear();
  });

  const makeAction = (type: string = 'cell_edit', payload: Record<string, unknown> = {}): UndoAction => ({
    type: type as UndoAction['type'],
    sheetId: 'test-sheet',
    payload,
  });

  it('starts with empty stacks', () => {
    const state = useUndoStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
  });

  it('pushes actions to past', () => {
    const { push } = useUndoStore.getState();
    push(makeAction());
    push(makeAction());
    expect(useUndoStore.getState().past).toHaveLength(2);
  });

  it('clears future on push', () => {
    const store = useUndoStore.getState();
    store.push(makeAction());
    store.push(makeAction());
    store.undo();
    expect(useUndoStore.getState().future).toHaveLength(1);
    store.push(makeAction());
    expect(useUndoStore.getState().future).toHaveLength(0);
  });

  it('undo moves action from past to future', () => {
    const store = useUndoStore.getState();
    const action = makeAction('cell_edit', { value: 42 });
    store.push(action);
    const undone = store.undo();
    expect(undone).toEqual(action);
    expect(useUndoStore.getState().past).toHaveLength(0);
    expect(useUndoStore.getState().future).toHaveLength(1);
  });

  it('redo moves action from future to past', () => {
    const store = useUndoStore.getState();
    const action = makeAction();
    store.push(action);
    store.undo();
    const redone = store.redo();
    expect(redone).toEqual(action);
    expect(useUndoStore.getState().past).toHaveLength(1);
    expect(useUndoStore.getState().future).toHaveLength(0);
  });

  it('undo returns null when empty', () => {
    expect(useUndoStore.getState().undo()).toBeNull();
  });

  it('redo returns null when empty', () => {
    expect(useUndoStore.getState().redo()).toBeNull();
  });

  it('caps stack at 50', () => {
    const store = useUndoStore.getState();
    for (let i = 0; i < 60; i++) {
      store.push(makeAction('cell_edit', { i }));
    }
    expect(useUndoStore.getState().past.length).toBeLessThanOrEqual(50);
  });

  it('clear resets both stacks', () => {
    const store = useUndoStore.getState();
    store.push(makeAction());
    store.push(makeAction());
    store.undo();
    store.clear();
    expect(useUndoStore.getState().past).toHaveLength(0);
    expect(useUndoStore.getState().future).toHaveLength(0);
  });
});

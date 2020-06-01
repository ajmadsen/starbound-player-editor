import { Store } from 'vuex';

const createEventPlugin = (safeOrigin: string): typeof eventPlugin => {
  const eventPlugin = <T>(store: Store<T>): void => {
    window.addEventListener('message', (ev) => {
      if (ev.origin !== safeOrigin) return;

      console.log('got message', ev);
      const { name, payload } = ev.data;
      switch (name) {
        case 'player-selected':
          store.commit('setPlayer', payload);
          break;
      }
    });
  };
  return eventPlugin;
};

export default createEventPlugin;

import { Store } from 'vuex';
import { Player } from '../../../types/player';

interface State {
  player: Player | null;
}

const createEventPlugin = (safeOrigin: string): typeof eventPlugin => {
  const eventPlugin = <T extends State>(store: Store<T>): void => {
    window.addEventListener('message', (ev) => {
      if (ev.origin !== safeOrigin) return;

      const { name, payload } = ev.data;
      switch (name) {
        case 'player-selected':
          store.commit('setPlayer', payload);
          break;
        case 'save-requested':
          store.commit('setSaving', { saving: true });
          break;
        default:
          if (name) console.log('unknown event', name);
      }
    });

    store.subscribe((mut, state) => {
      if (mut.type === 'setSaving' && mut.payload['saving'] === false) {
        window.starboundService.savePlayer(state.player);
      }
    });
  };
  return eventPlugin;
};

export default createEventPlugin;

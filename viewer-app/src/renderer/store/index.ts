import Vue from 'vue';
import Vuex from 'vuex';
import { Player } from '../../types/player';
import createEventPlugin from './plugins/events';

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    player: null as Player | null,
  },
  mutations: {
    setPlayer(state, { player }): void {
      state.player = player.contents.content;
    },
  },
  plugins: [createEventPlugin(SAFE_ORIGIN)],
});

export default store;

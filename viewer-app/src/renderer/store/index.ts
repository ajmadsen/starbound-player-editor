import Vue from 'vue';
import Vuex from 'vuex';
import { Player } from '../../types/player';
import createEventPlugin from './plugins/events';
import { BodyPart } from '../player/PlayerSprite';

if (module.hot) {
  module.hot.accept();
}

Vue.use(Vuex);

type Directive = {
  part: BodyPart;
  directive: string;
};

const store = new Vuex.Store({
  state: {
    player: null as Player | null,
  },
  mutations: {
    setPlayer(state, { player }): void {
      state.player = player.contents.content;
    },
    applyDirective(state, { part, directive }: Directive): void {
      if (!state.player) return;

      switch (part) {
        case 'body':
          state.player.identity.bodyDirectives = directive;
          break;
        case 'facial hair':
          state.player.identity.facialHairDirectives = directive;
          break;
        case 'hair':
          state.player.identity.hairDirectives = directive;
          break;
        case 'mask':
          state.player.identity.facialMaskDirectives = directive;
          break;
      }
    },
  },
  plugins: [createEventPlugin(SAFE_ORIGIN)],
});

export default store;

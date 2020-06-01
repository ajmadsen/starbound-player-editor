import './index.scss';
import App from './App.vue';
import Vue, { VNode } from 'vue';
import VueCompositionApi from '@vue/composition-api';
import store from './store';
import { stateProvider } from './store/composition';

Vue.use(VueCompositionApi);

new Vue({
  el: '#app',
  render: (h): VNode => h(stateProvider, { props: { store } }, [h(App)]),
});

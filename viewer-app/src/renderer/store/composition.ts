import {
  provide,
  inject,
  defineComponent,
  createElement as h,
} from '@vue/composition-api';
import store from '.';
import { VNode } from 'vue';

const StoreSymbol = Symbol();

export function provideStore(s: typeof store): void {
  provide(StoreSymbol, s);
}

export function useStore(): typeof store {
  const _store: typeof store | void = inject(StoreSymbol);
  if (!_store) throw new Error('unable to find store');
  return _store;
}

type StateProviderProps = {
  store: typeof store;
};

export const stateProvider = defineComponent({
  props: {
    store: Object,
  },
  setup(props: StateProviderProps, { slots }) {
    provideStore(props.store);
    return (): VNode[] => slots.default();
  },
});

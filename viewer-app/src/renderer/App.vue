<template>
  <player :player="player" :saving="saving" />
</template>

<script lang="ts">
import Player from './components/Player.vue';
import { defineComponent, computed } from '@vue/composition-api';
import { useStore } from './store/composition';

export default defineComponent({
  props: {},
  components: {
    Player,
  },
  setup() {
    const store = useStore();
    const player = computed(() => store.state.player);
    const saving = computed(() => store.state.saving);
    return { player, saving };
  },
});
</script>

<style lang="sass" scoped></style>

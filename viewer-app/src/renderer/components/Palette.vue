<template>
  <div>
    <color-picker
      v-for="[idx, color] in colors.entries()"
      :key="idx"
      :color="color"
      @remap="$emit('remap', $event)"
    />
  </div>
</template>

<script lang="ts">
import ColorPicker from './ColorPicker.vue';
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  props: {
    colors: Array,
  },
  components: { ColorPicker },
});
</script>

<style scoped lang="scss"></style>

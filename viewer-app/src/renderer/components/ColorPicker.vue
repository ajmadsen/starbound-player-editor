<template>
  <input
    type="color"
    class="colorpick"
    :value="formattedColor"
    @input="$emit('input', $event.target.value)"
  />
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { fmtColor } from '../utils';

export default defineComponent({
  props: {
    color: { type: [String, Number], required: true },
  },
  setup(props) {
    const formattedColor = computed(() => `${fmtColor(props.color)}`);
    return { formattedColor };
  },
});
</script>

<style scoped lang="scss">
.colorpick {
  $shadow: 6px;
  $br: 4px;

  border: 0;
  padding: 0;
  margin: 5px;
  vertical-align: top;
  background-color: transparent;
  width: 25px;
  height: 25px;
  border-radius: $br;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 0;
    border-radius: $br;
    box-shadow: 0px 0px $shadow #333;
  }

  &:focus::-webkit-color-swatch {
    box-shadow: inset 0 0 0 0.6px #0008;
  }

  &:focus {
    outline: 0;
    box-shadow: 0 0 ($shadow * 1.75) #111;
  }
}
</style>

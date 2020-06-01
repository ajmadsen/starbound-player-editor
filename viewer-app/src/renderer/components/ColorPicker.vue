<template>
  <input
    type="color"
    class="colorpick"
    :value="formattedColor"
    @input="onInput($event.target.value)"
  />
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { fmtColor } from '../utils';
import { debounce } from 'lodash';

export default defineComponent({
  props: {
    color: [String, Number],
  },
  setup(props, { emit }) {
    const formattedColor = computed(() => `${fmtColor(props.color)}`);
    const lastColor = ref(formattedColor.value);

    const onInput = debounce((color: string): void => {
      emit('remap', {
        original: formattedColor,
        old: lastColor.value,
        new: color,
      });
      lastColor.value = color;
    }, 5);

    return { formattedColor, onInput };
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
  box-shadow: 0px 0px $shadow #333;
  border-radius: $br;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 0;
    border-radius: $br;
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

<template>
  <div>
    <section class="player">
      <canvas width="150" height="150" ref="canvas"></canvas>
      <div class="player-info" v-if="data.sprite">
        <div>
          <strong>Name</strong>
          <span>{{ player.identity.name }}</span>
        </div>
        <div>
          <strong>Species</strong>
          <span>{{ titleCase(player.identity.species) }}</span>
        </div>
        <div>
          <strong>Gender</strong>
          <span>{{ titleCase(player.identity.gender) }}</span>
        </div>
      </div>
    </section>
    <section>
      <div v-for="[part, palette] in data.palettes" :key="part">
        <h4>{{ translate(part) }}</h4>
        <palette :colors="palette" @remap="onRemap(part, $event)" />
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { Player } from '../../types/player';
import { PlayerSprite, BodyPart } from '../player/PlayerSprite';
import {
  defineComponent,
  ref,
  watchEffect,
  reactive,
  watch,
  onMounted,
} from '@vue/composition-api';
import Palette from './Palette.vue';
import { titleCase, fmtColor } from '../utils';
import { debounce } from 'lodash';
import { useStore } from '../store/composition';

export default defineComponent({
  props: {
    player: Object as () => Player,
    saving: Boolean as () => boolean,
  },
  setup(props) {
    const canvas = ref<HTMLCanvasElement>(null);
    const data = reactive({
      sprite: null as PlayerSprite | null,
      palettes: [] as [BodyPart, string[]][],
    });
    const store = useStore();

    let ctx: CanvasRenderingContext2D | null | undefined;
    onMounted(() => {
      ctx = canvas.value?.getContext('2d');
      if (!ctx) throw new Error('unable to get 2d rendering context');

      ctx.scale(3, 3);
      ctx.imageSmoothingEnabled = false;
    });

    function draw(): void {
      if (ctx) data.sprite?.draw(ctx);
    }

    function translate(part: BodyPart): string {
      return titleCase(
        {
          body: 'body',
          hair: props.player?.identity.hairGroup || 'hair',
          'facial hair':
            props.player?.identity.facialHairGroup || 'facial hair',
          mask: props.player?.identity.facialMaskGroup || 'mask',
        }[part]
      );
    }

    const colorMap: Record<BodyPart, Record<string, string>> = {} as any;

    const onRemap = debounce(
      (
        part: BodyPart,
        { color, newColor }: Record<'color' | 'newColor', string>
      ): void => {
        if (!(part in colorMap)) {
          colorMap[part] = {};
        }
        const partMap = colorMap[part];
        if (!(color in partMap)) {
          partMap[color] = color;
        }
        const prevColor = partMap[color];
        partMap[color] = newColor;

        const directive = `?replace;${prevColor.slice(1)}=${newColor.slice(1)}`;
        data.sprite?.applyDirectives(part, directive);
        draw();
      },
      10
    );

    watchEffect(() => {
      if (!props.player) return;
      PlayerSprite.load(props.player.identity).then((sprite) => {
        data.sprite = sprite;
        data.palettes = Object.entries(data.sprite?.allPalettes() || {}).map(
          ([k, v]) =>
            [k, [...v].map((c) => fmtColor(c))] as [BodyPart, string[]]
        );
      });
    });

    watch(
      () => data.sprite,
      () => {
        if (data.sprite) draw();
      }
    );

    watchEffect(() => {
      if (!props.saving) return;
      for (const [part, directive] of Object.entries(colorMap)) {
        store.commit('applyDirective', {
          part: part as BodyPart,
          directive:
            '?replace;' +
            Object.entries(directive)
              .map(([old, new_]) => `${old.slice(1)}=${new_.slice(1)}`)
              .join(';'),
        });
      }
      store.commit('setSaving', { saving: false });
    });

    return {
      canvas,
      data,
      translate,
      onRemap,
      titleCase,
    };
  },
  components: { Palette },
});
</script>

<style scoped lang="scss">
.player {
  display: flex;
}

.player-info {
  margin: 2em 3em;

  & > div {
    display: flex;
    justify-content: space-between;
  }
  & span {
    margin-left: 1em;
  }
}
</style>

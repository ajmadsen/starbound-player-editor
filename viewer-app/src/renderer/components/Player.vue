<template>
  <div>
    <section class="player">
      <canvas width="150" height="150" ref="canvas"></canvas>
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
import { PropType } from 'vue';
import Palette from './Palette.vue';
import { titleCase, fmtColor } from '../utils';
import { debounce } from 'lodash';

type ComponentProps = {
  player: Player;
};

export default defineComponent({
  props: {
    player: {} as PropType<Player>,
  },
  setup(props: ComponentProps) {
    const canvas = ref<HTMLCanvasElement>(null);
    const data = reactive({
      sprite: null as PlayerSprite | null,
      palettes: [] as [BodyPart, string[]][],
    });

    let ctx: CanvasRenderingContext2D;
    onMounted(() => {
      ctx = canvas.value?.getContext('2d');
      if (!ctx) throw new Error('unable to get 2d rendering context');

      ctx.scale(3, 3);
      ctx.imageSmoothingEnabled = false;
    });

    function draw(): void {
      data.sprite.draw(ctx);
    }

    function translate(part: BodyPart): string {
      return titleCase(
        {
          body: 'body',
          hair: props.player.identity.hairGroup,
          'facial hair': props.player.identity.facialHairGroup,
          mask: props.player.identity.facialMaskGroup,
        }[part]
      );
    }

    const onRemap = (
      part: BodyPart,
      { old, new: new_ }: Record<'old' | 'new', string>
    ): void => {
      console.log(old, new_);
      const directive = `?replace;${old.slice(1)}=${new_.slice(1)}`;
      data.sprite.applyDirectives(part, directive);
      draw();
    };

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
      () => draw()
    );

    return {
      canvas,
      data,
      translate,
      onRemap,
    };
  },
  components: { Palette },
});
/*
const display = async (identity: Identity): Promise<void> =>
  PlayerSprite.load(identity).then(async (player) => {
    const canvas = el('canvas');
    canvas.width = 150;
    canvas.height = 150;
    a(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(3, 3);
    ctx.imageSmoothingEnabled = false;

    const redraw = (): void => {
      player.draw(ctx);
    };
    redraw();

    const onInput = (
      initial: number | string,
      target: BodyPart
    ): ((arg: string) => void) => {
      let last = fmtColor(initial);

      return debounce((color: string) => {
        const to = color.substr(1);
        player.applyDirectives(target, `?replace;${last}=${to}`);
        last = to;
        redraw();
      }, 5);
    };

    const picker = (title: string, target: BodyPart): HTMLDivElement => {
      const container = el('div');
      container.className = 'picker';

      const t = el('h4');
      t.innerText = title;
      container.appendChild(t);

      const colorSet = player.partPalette(target);

      colorSet.forEach((c) =>
        container.appendChild(pixContainer(c, onInput(c, target)))
      );

      return container;
    };

    a(picker('Body', 'body'));
    a(picker(titleCase(identity.hairGroup), 'hair'));
    a(picker(titleCase(identity.facialHairGroup), 'facial hair'));
    a(picker(titleCase(identity.facialMaskGroup), 'mask'));
  });
  */
</script>

<style scoped lang="scss">
.player {
  display: flex;
}
</style>

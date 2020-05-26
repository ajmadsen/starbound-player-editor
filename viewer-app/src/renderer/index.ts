import { Identity } from '../types/player';
import './index.scss';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    starboundService: any;
  }
}

import { debounce } from 'lodash';
import { PlayerSprite, BodyPart } from './player/PlayerSprite';

const el = document.createElement.bind(document);
const a = document.body.appendChild.bind(document.body);

const fmtColor = (color: string | number): string =>
  typeof color === 'string' ? color : color.toString(16).padStart(6, '0');

const picker = (color: string): HTMLInputElement => {
  const input = el('input');
  input.type = 'color';
  input.className = 'colorpick';
  input.value = `#${color}`;
  return input;
};

const pixContainer = (
  to: number | string,
  onInput: (color: string) => void
): HTMLDivElement => {
  const cont = el('div');
  cont.style.margin = '5px';
  cont.style.display = 'inline-block';

  const sTo = fmtColor(to);
  const pickEl = picker(sTo);

  pickEl.addEventListener('input', (e) =>
    onInput((e.target as HTMLInputElement).value)
  );
  cont.appendChild(pickEl);

  return cont;
};

const titleCase = (input: string): string =>
  input
    .split(' ')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');

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

window.addEventListener('message', (ev) => {
  if (ev.origin !== SAFE_ORIGIN) return;

  console.log('got message', ev);
  const { name, payload } = ev.data;
  switch (name) {
    case 'player-selected':
      document.body.innerHTML = '';
      display(payload.player.contents.content.identity);
      break;
  }
});

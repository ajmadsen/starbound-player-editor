import Player from './player.json';
import './main.scss';
import { debounce } from 'lodash';

const el = document.createElement.bind(document);
const a = document.body.appendChild.bind(document.body);

const splitHex = (hex: string) => {
  const step = Math.floor(hex.length / 3);
  return (
    hex.match(new RegExp(`\\w{${step}}`, 'g'))?.map((s) => parseInt(s, 16)) || [
      0,
      0,
      0,
    ]
  );
};

const parseDirectives = (strDirectives: string) => {
  const split = strDirectives.split('?');
  return split
    .filter((dir) => dir !== '')
    .map((dir) => {
      let els = dir.split(';');
      if (els[0]?.includes('=')) {
        const [dir, arg0] = els[0].split('=', 2);
        els[0] = arg0;
        els.unshift(dir);
      }
      return els;
    });
};

const replace = (args: string[]): Mutation => {
  const map: Record<number, number[]> = Object.fromEntries(
    args.map((arg) => {
      const [from, to] = arg.split('=');
      const fromColor = splitHex(from)?.reduce(
        (col, comp) => (col << 8) | comp,
        0
      );
      const toColor = splitHex(to);
      return [fromColor, toColor];
    })
  );

  return (data: Uint8ClampedArray) => {
    const c = (data[0] << 16) | (data[1] << 8) | data[2];
    const rep = map[c];
    if (rep) {
      data[0] = rep[0];
      data[1] = rep[1];
      data[2] = rep[2];
    }
    return data;
  };
};

type Mutation = ((data: Uint8ClampedArray) => Uint8ClampedArray) | undefined;
const compose = (f: Mutation, g: Mutation): Mutation =>
  !g ? f : !f ? g : (x) => f(g(x));

const mapDirectives = (directives: string[][]): Mutation => {
  let mutations = undefined;

  for (const [cmd, ...args] of directives) {
    switch (cmd) {
      case 'replace':
        mutations = compose(replace(args), mutations);
        break;
    }
  }

  return mutations;
};

const mutable = (image: ImageData) => (mutation: Mutation) => {
  if (!mutation) return image;
  for (let i = 0; i < image.data.length; i += 4) {
    mutation(image.data.subarray(i, i + 4));
  }
  return image;
};

type Identity = typeof Player['identity'];
type FrameResource = [string, FrameData];

const getBody = async ({ species, gender }: Identity) =>
  [
    (await import(`../out/humanoid/${species}/${gender}body.png`)).default,
    (await import(`../out/humanoid/${gender}body.frames`)).default,
  ] as FrameResource;

const getBackArm = async ({ species }: Identity) =>
  (await import(`../out/humanoid/${species}/backarm.png`)).default as string;

const getFrontArm = async ({ species }: Identity) =>
  (await import(`../out/humanoid/${species}/frontarm.png`)).default as string;

const getHead = async ({ species, gender }: Identity) =>
  [
    (await import(`../out/humanoid/${species}/${gender}head.png`)).default,
    (await import(`../out/humanoid/${gender}head.frames`)).default,
  ] as FrameResource;

const getFacialHair = async ({
  species,
  facialHairGroup,
  facialHairType,
}: Identity) =>
  [
    (
      await import(
        `../out/humanoid/${species}/${facialHairGroup}/${facialHairType}.png`
      )
    ).default,
    (
      await import(
        `../out/humanoid/${species}/${facialHairGroup}/default.frames`
      )
    ).default,
  ] as FrameResource;

const getHair = async ({ species, hairGroup, hairType }: Identity) =>
  [
    (await import(`../out/humanoid/${species}/${hairGroup}/${hairType}.png`))
      .default,
    (await import(`../out/humanoid/${species}/${hairGroup}/default.frames`))
      .default,
  ] as FrameResource;

const getMask = async ({
  species,
  facialMaskGroup,
  facialMaskType,
}: Identity) =>
  [
    (
      await import(
        `../out/humanoid/${species}/${facialMaskGroup}/${facialMaskType}.png`
      )
    ).default,
    (
      await import(
        `../out/humanoid/${species}/${facialMaskGroup}/default.frames`
      )
    ).default,
  ] as FrameResource;

const SpriteSheet = (sheet: ImageBitmap, frames: FrameData) => {
  const canvas = el('canvas');
  canvas.width = sheet.width;
  canvas.height = sheet.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('could not create rendering context');

  const clipFrames = () => {
    let clipping: Record<string, [number, number, number, number]> = {};

    ctx.beginPath();
    if (frames.frameGrid) {
      const {
        size: [fx, fy],
        dimensions: [dx, dy],
        names,
      } = frames.frameGrid;

      for (const [iy, row] of names.entries()) {
        if (iy > dy)
          throw new Error('sprite sheet does not match frame data, iy > dy');
        for (const [ix, name] of row.entries()) {
          if (ix > dx)
            throw new Error('sprite sheet does not match frame data, ix > dx');
          if (name === null) continue;
          ctx.rect(ix * fx, iy * fy, fx, fy);
          clipping[name] = [ix * fx, iy * fy, fx, fy];
        }
      }
    }

    if (frames.frameList) {
      for (const name in frames.frameList) {
        const [sx, sy, ex, ey] = frames.frameList[name];
        ctx.rect(sx, sy, ex - sx, ey - sy);
        clipping[name] = [sx, sy, ex - sx, ey - sy];
      }
    }

    if (frames.aliases) {
      for (const [alias, origName] of Object.entries(frames.aliases)) {
        const orig = clipping[origName];
        if (!orig) throw new Error('Original frame not found');
        clipping[alias] = orig;
      }
    }
    ctx.clip();

    return clipping;
  };

  const clipping = clipFrames();
  ctx.save();

  ctx.drawImage(sheet, 0, 0);

  function getPalette(d: Uint8ClampedArray) {
    let palette: Set<number> = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      if (c || d[i + 3] > 0) palette.add(c);
    }
    return palette;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const initialPalette = getPalette(imageData.data);

  return {
    ctx,
    imageData,
    initialPalette,
    colorMapping: undefined as Map<number, number> | undefined,

    reset() {
      ctx.drawImage(sheet, 0, 0);
      this.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.colorMapping = undefined;
      return this;
    },

    applyDirectives(directiveStr: string) {
      const directives = parseDirectives(directiveStr);
      const mutation = mapDirectives(directives);

      const apply = mutable(this.imageData);
      ctx.putImageData(apply(mutation), 0, 0);
      this.colorMapping = this.getColorMapping(mutation);

      return this;
    },

    draw(ctx: CanvasRenderingContext2D, frame: string, sx: number, sy: number) {
      const fd = clipping[frame];
      if (!fd) throw new Error('frame not found in sprite sheet');

      ctx.save();
      ctx.beginPath();
      ctx.translate(sx, sy);
      ctx.rect(0, 0, fd[2], fd[3]);
      ctx.clip();
      ctx.drawImage(canvas, -fd[0], -fd[1]);
      ctx.restore();

      return this;
    },

    getPalette() {
      return getPalette(this.imageData.data);
    },

    getColorMapping(mutation: Mutation) {
      const im = ctx.createImageData(1, 1);
      const data = im.data;
      let colorMap = new Map<number, number>();
      this.initialPalette.forEach((c) => {
        data[0] = (c >> 16) & 0xff;
        data[1] = (c >> 8) & 0xff;
        data[2] = c & 0xff;
        data[3] = 0xff;

        const out = mutable(im)(mutation).data;
        const nc = (out[0] << 16) | (out[1] << 8) | out[2];
        colorMap.set(c, nc);
      });
      return colorMap;
    },
  };
};

type SpriteSheet = ReturnType<typeof SpriteSheet>;

const loadIdentity = async (id: Identity) => {
  const [body, bodyFrames] = await getBody(id);
  const [head, headFrames] = await getHead(id);
  const [hair, hairFrames] = await getHair(id);
  const [mask, maskFrames] = await getMask(id);
  const [facialHair, facialHairFrames] = await getFacialHair(id);
  const frontArm = await getFrontArm(id);
  const backArm = await getBackArm(id);

  const bodySS = SpriteSheet(await loadImage(body), bodyFrames).applyDirectives(
    id.bodyDirectives
  );
  const headSS = SpriteSheet(await loadImage(head), headFrames).applyDirectives(
    id.bodyDirectives
  );
  const fArmSS = SpriteSheet(
    await loadImage(frontArm),
    bodyFrames
  ).applyDirectives(id.bodyDirectives);
  const bArmSS = SpriteSheet(
    await loadImage(backArm),
    bodyFrames
  ).applyDirectives(id.bodyDirectives);

  const hairSS = SpriteSheet(await loadImage(hair), hairFrames).applyDirectives(
    id.hairDirectives
  );

  const fHairSS = SpriteSheet(
    await loadImage(facialHair),
    facialHairFrames
  ).applyDirectives(id.facialHairDirectives);

  const maskSS = SpriteSheet(await loadImage(mask), maskFrames).applyDirectives(
    id.facialMaskDirectives
  );

  return {
    body: bodySS,
    frontArm: fArmSS,
    backArm: bArmSS,
    head: headSS,
    hair: hairSS,
    facialHair: fHairSS,
    mask: maskSS,
  };
};

const loadImage = async (src: string): Promise<ImageBitmap> => {
  let image = new Image();
  return new Promise((resolve, reject) => {
    image.onload = function () {
      resolve(createImageBitmap(image));
    };
    image.onerror = function (err) {
      reject(err);
    };
    image.src = src;
  });
};

const { identity } = Player;

const canvas = el('canvas');
canvas.width = 150;
canvas.height = 150;
a(canvas);

const pix = (color: string | number) => {
  if (typeof color === 'number') {
    color = color.toString(16).padStart(6, '0');
  }
  const box = el('div');
  box.className = 'pix';

  box.style.backgroundColor = `#${color}`;
  return box;
};

const fmtColor = (color: string | number): string =>
  typeof color === 'string' ? color : color.toString(16).padStart(6, '0');

const picker = (color: string) => {
  const input = el('input');
  input.type = 'color';
  input.className = 'colorpick';
  input.value = `#${color}`;
  return input;
};

const pixContainer = (
  to: number | string,
  onInput: (color: string) => void
) => {
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

loadIdentity(identity).then(
  async ({ body, backArm, frontArm, head, hair, mask, facialHair }) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(3, 3);
    ctx.imageSmoothingEnabled = false;

    const headFrame = 'normal';
    const idle = identity.personalityIdle;
    const armIdle = identity.personalityArmIdle;

    const [hx, hy] = identity.personalityHeadOffset;
    const [ax, ay] = identity.personalityArmOffset;

    const redraw = () => {
      backArm.draw(ctx, armIdle, ax, ay);
      body.draw(ctx, idle, 0, 0);
      frontArm.draw(ctx, armIdle, ax, ay);
      head.draw(ctx, headFrame, hx, hy);
      hair.draw(ctx, headFrame, hx, hy);
      facialHair.draw(ctx, headFrame, hx, hy);
      mask.draw(ctx, headFrame, hx, hy);
    };
    redraw();

    const onInput = (initial: number | string, ...sprites: SpriteSheet[]) => {
      let last = fmtColor(initial);

      return debounce((color: string) => {
        const to = color.substr(1);
        sprites.forEach((s) => s.applyDirectives(`?replace;${last}=${to}`));
        last = to;
        redraw();
      }, 5);
    };

    const picker = (title: string, ...sprites: SpriteSheet[]) => {
      const container = el('div');
      container.className = 'picker';

      const t = el('h4');
      t.innerText = title;
      container.appendChild(t);

      const colorSet = sprites
        .map((s) => s.colorMapping)
        .reduce(
          (all, one) => (one?.forEach((v) => all.add(v)), all),
          new Set<number>()
        );

      colorSet.forEach((c) =>
        container.appendChild(pixContainer(c, onInput(c, ...sprites)))
      );

      return container;
    };

    a(picker('Body', body, head, backArm, frontArm));
    a(picker('Hair', hair));
    a(picker('Facial Hair', facialHair));
    a(picker('Mask', mask));
  }
);

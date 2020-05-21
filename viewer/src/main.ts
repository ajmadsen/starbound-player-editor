import Player from './player.json';
import './main.scss';

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

const getImageData = (image: ImageBitmap) => {
  const canvas = el('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d');
  ctx?.drawImage(image, 0, 0);
  return ctx?.getImageData(0, 0, image.width, image.height);
};

const replace = (image: ImageData, args: string[]) => {
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
  console.log(map);

  let d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const c = (d[i + 0] << 16) | (d[i + 1] << 8) | d[i + 2];
    const rep = map[c];
    if (rep) {
      d[i + 0] = rep[0];
      d[i + 1] = rep[1];
      d[i + 2] = rep[2];
    }
  }
};

const mutate = async (image: ImageBitmap, directives: string[][]) => {
  const data = getImageData(image);
  if (!data) return image;

  for (const [cmd, ...args] of directives) {
    switch (cmd) {
      case 'replace':
        replace(data, args);
        break;
    }
  }

  return createImageBitmap(data);
};

type Frames = Record<string, ImageBitmap>;
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

const loadIdentity = async (id: Identity) => {
  const [body, bodyFrames] = await getBody(id);
  const [head, headFrames] = await getHead(id);
  const [hair, hairFrames] = await getHair(id);
  const [mask, maskFrames] = await getMask(id);
  const [facialHair, facialHairFrames] = await getFacialHair(id);
  const frontArm = await getFrontArm(id);
  const backArm = await getBackArm(id);

  // mutate
  const bodyDir = parseDirectives(id.bodyDirectives);
  const fixedBody = await mutate(await loadImage(body), bodyDir);
  const fixedHead = await mutate(await loadImage(head), bodyDir);
  const fixedFrontArm = await mutate(await loadImage(frontArm), bodyDir);
  const fixedBackArm = await mutate(await loadImage(backArm), bodyDir);

  const hairDir = parseDirectives(id.hairDirectives);
  const fixedHair = await mutate(await loadImage(hair), hairDir);

  const maskDir = parseDirectives(id.facialMaskDirectives);
  const fixedMask = await mutate(await loadImage(mask), maskDir);

  const fhDir = parseDirectives(id.facialHairDirectives);
  const fixedFH = await mutate(await loadImage(facialHair), fhDir);

  return {
    body: await buildFrames(fixedBody, bodyFrames),
    frontArm: await buildFrames(fixedFrontArm, bodyFrames),
    backArm: await buildFrames(fixedBackArm, bodyFrames),
    head: await buildFrames(fixedHead, headFrames),
    hair: await buildFrames(fixedHair, hairFrames),
    mask: await buildFrames(fixedMask, maskFrames),
    facialHair: await buildFrames(fixedFH, facialHairFrames),
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

const buildFrames = async (
  spriteSheet: ImageBitmap,
  frameData: FrameData
): Promise<Frames> => {
  let frames: Frames = {};
  if (frameData.frameGrid) {
    const {
      size: [fx, fy],
      dimensions: [dx, dy],
      names,
    } = frameData.frameGrid;

    for (const [iy, row] of names.entries()) {
      if (iy > dy)
        throw new Error('sprite sheet does not match frame data, iy > dy');
      for (const [ix, name] of row.entries()) {
        if (ix > dx)
          throw new Error('sprite sheet does not match frame data, ix > dx');
        if (name === null) continue;
        frames[name] = await createImageBitmap(
          spriteSheet,
          ix * fx,
          iy * fy,
          fx,
          fy
        );
      }
    }
  }

  if (frameData.frameList) {
    for (const name in frameData.frameList) {
      const [sx, sy, ex, ey] = frameData.frameList[name];
      frames[name] = await createImageBitmap(
        spriteSheet,
        sx,
        sy,
        ex - sx,
        ey - sy
      );
    }
  }

  if (frameData.aliases) {
    for (const alias in frameData.aliases) {
      const orig = frames[frameData.aliases[alias]];
      if (!orig) throw new Error('Original frame not found');
      frames[alias] = orig;
    }
  }

  return frames;
};

const { identity } = Player;

const canvas = el('canvas');
canvas.width = 150;
canvas.height = 150;
a(canvas);

loadIdentity(identity).then(
  async ({ body, backArm, frontArm, head, hair, mask, facialHair }) => {
    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(3, 3);
    context.imageSmoothingEnabled = false;

    const headFrame = 'normal';
    const idle = identity.personalityIdle;
    const armIdle = identity.personalityArmIdle;

    const [hx, hy] = identity.personalityHeadOffset;
    const [ax, ay] = identity.personalityArmOffset;

    context.drawImage(backArm[armIdle], ax, ay);
    context.drawImage(body[idle], 0, 0);
    context.drawImage(frontArm[armIdle], ax, ay);
    context.drawImage(head[headFrame], hx, hy);
    context.drawImage(hair[headFrame], hx, hy);
    context.drawImage(facialHair[headFrame], hx, hy);
    context.drawImage(mask[headFrame], hx, hy);
  }
);

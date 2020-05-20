import Player from './player.json';
import './main.scss';

const el = document.createElement.bind(document);
const a = document.body.appendChild.bind(document.body);

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

  return {
    body: await buildFrames(await loadImage(body), bodyFrames),
    frontArm: await buildFrames(await loadImage(frontArm), bodyFrames),
    backArm: await buildFrames(await loadImage(backArm), bodyFrames),
    head: await buildFrames(await loadImage(head), headFrames),
    hair: await buildFrames(await loadImage(hair), hairFrames),
    mask: await buildFrames(await loadImage(mask), maskFrames),
    facialHair: await buildFrames(
      await loadImage(facialHair),
      facialHairFrames
    ),
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
    const headFrame = 'normal';
    const idle = identity.personalityIdle;
    const armIdle = identity.personalityArmIdle;

    context?.scale(3, 3);
    context?.drawImage(backArm[armIdle], 0, 0);
    context?.drawImage(body[idle], 0, 0);
    context?.drawImage(frontArm[armIdle], 0, 0);
    context?.drawImage(head[headFrame], 0, 0);
    context?.drawImage(hair[headFrame], 0, 0);
    context?.drawImage(facialHair[headFrame], 0, 0);
    context?.drawImage(mask[headFrame], 0, 0);
  }
);

a(el('br'));

const p = el('code');
p.innerHTML = JSON.stringify(identity, undefined, '  ');
a(p);

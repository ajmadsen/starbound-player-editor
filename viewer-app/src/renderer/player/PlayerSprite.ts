import { FrameData, Identity } from '../../types/player';
import { SpriteSheet, Palette } from './SpriteSheet';
import json5 from 'json5';

type FrameResource = [ImageBitmap, FrameData];
const { getResource } = window.starboundService;

const getPng = async (path: string): Promise<ImageBitmap> =>
  createImageBitmap(
    new Blob([(await getResource(path)).contents], { type: 'image/png' })
  );

const getJson5 = async (path: string): Promise<any> =>
  json5.parse(
    await getResource(path).then((r: any) => new Blob([r.contents]).text())
  );

const getBody = async ({
  species,
  gender,
}: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/${gender}body.png`),
  await getJson5(`/humanoid/${gender}body.frames`),
];

const getBackArm = async ({ species }: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/backarm.png`),
  await getJson5(`/humanoid/backarm.frames`),
];

const getFrontArm = async ({ species }: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/frontarm.png`),
  await getJson5(`/humanoid/frontarm.frames`),
];

const getHead = async ({
  species,
  gender,
}: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/${gender}head.png`),
  await getJson5(`/humanoid/${gender}head.frames`),
];

const getFacialHair = async ({
  species,
  facialHairGroup,
  facialHairType,
}: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/${facialHairGroup}/${facialHairType}.png`),
  await getJson5(`/humanoid/${species}/${facialHairGroup}/default.frames`),
];

const getHair = async ({
  species,
  hairGroup,
  hairType,
}: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/${hairGroup}/${hairType}.png`),
  await getJson5(`/humanoid/${species}/${hairGroup}/default.frames`),
];

const getMask = async ({
  species,
  facialMaskGroup,
  facialMaskType,
}: Identity): Promise<FrameResource> => [
  await getPng(`/humanoid/${species}/${facialMaskGroup}/${facialMaskType}.png`),
  await getJson5(`/humanoid/${species}/${facialMaskGroup}/default.frames`),
];

export type BodyPart = 'body' | 'hair' | 'facial hair' | 'mask';

export class PlayerSprite {
  private state: string;
  private partMap: Record<BodyPart, SpriteSheet[]> = {
    body: [this.backArm, this.body, this.head, this.frontArm],
    hair: [this.hair],
    'facial hair': [this.facialHair],
    mask: [this.mask],
  };

  private constructor(
    protected id: Identity,
    protected body: SpriteSheet,
    protected frontArm: SpriteSheet,
    protected backArm: SpriteSheet,
    protected head: SpriteSheet,
    protected hair: SpriteSheet,
    protected mask: SpriteSheet,
    protected facialHair: SpriteSheet
  ) {
    this.state = 'idle';
  }

  static async load(id: Identity): Promise<PlayerSprite> {
    const [body, bodyFrames] = await getBody(id);
    const [head, headFrames] = await getHead(id);
    const [hair, hairFrames] = await getHair(id);
    const [mask, maskFrames] = await getMask(id);
    const [facialHair, facialHairFrames] = await getFacialHair(id);
    const [frontArm, fArmFrames] = await getFrontArm(id);
    const [backArm, bArmFrames] = await getBackArm(id);

    const bodySS = new SpriteSheet(body, bodyFrames).applyDirectives(
      id.bodyDirectives
    );
    const headSS = new SpriteSheet(head, headFrames).applyDirectives(
      id.bodyDirectives
    );
    const fArmSS = new SpriteSheet(frontArm, fArmFrames).applyDirectives(
      id.bodyDirectives
    );
    const bArmSS = new SpriteSheet(backArm, bArmFrames).applyDirectives(
      id.bodyDirectives
    );

    const hairSS = new SpriteSheet(hair, hairFrames).applyDirectives(
      id.hairDirectives
    );

    const fHairSS = new SpriteSheet(
      facialHair,
      facialHairFrames
    ).applyDirectives(id.facialHairDirectives);

    const maskSS = new SpriteSheet(mask, maskFrames).applyDirectives(
      id.facialMaskDirectives
    );

    return new PlayerSprite(
      id,
      bodySS,
      fArmSS,
      bArmSS,
      headSS,
      hairSS,
      maskSS,
      fHairSS
    );
  }

  private getHeadState(): string {
    return this.state.startsWith('climb') ? 'climb' : 'normal';
  }

  draw(ctx: CanvasRenderingContext2D): PlayerSprite {
    const headFrame = this.getHeadState();

    let bodyState = this.state;
    let armState = this.state;

    if (this.state === 'idle') {
      bodyState = this.id.personalityIdle;
      armState = this.id.personalityArmIdle;
    }

    const [hx, hy] = this.id.personalityHeadOffset;
    const [ax, ay] = this.id.personalityArmOffset;

    this.backArm.draw(ctx, armState, ax, ay);
    this.body.draw(ctx, bodyState, 0, 0);
    this.frontArm.draw(ctx, armState, ax, ay);
    this.head.draw(ctx, headFrame, hx, hy);
    this.hair.draw(ctx, headFrame, hx, hy);
    this.facialHair.draw(ctx, headFrame, hx, hy);
    this.mask.draw(ctx, headFrame, hx, hy);

    return this;
  }

  applyDirectives(target: BodyPart, directives: string): PlayerSprite {
    this.partMap[target].forEach((part) => part.applyDirectives(directives));
    return this;
  }

  partPalette(target: BodyPart): Palette {
    return this.partMap[target]
      .map((s) => s.colorMapping)
      .reduce(
        (all, one) => (one?.forEach((v) => all.add(v)), all),
        new Set<number>()
      );
  }
}

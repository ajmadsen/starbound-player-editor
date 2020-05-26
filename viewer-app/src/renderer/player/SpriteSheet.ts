import { FrameData } from '../../types/player';
import { parseDirectives, mapDirectives, mutable, Mutation } from './drawing';

export type Palette = Set<number>;
export type Clipping = [number, number, number, number];

export class SpriteSheet {
  initialPalette: Palette;
  imageData: ImageData;
  colorMapping: Map<number, number> | undefined;

  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private clipping: Record<string, Clipping> = {};

  constructor(protected sheet: ImageBitmap, protected frames: FrameData) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = sheet.width;
    this.canvas.height = sheet.height;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('could not create rendering context');
    this.ctx = ctx;

    this.clipFrames();
    this.ctx.save();

    this.ctx.drawImage(sheet, 0, 0);

    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.initialPalette = this.getPalette();
  }

  private clipFrames(): void {
    this.clipping = {};
    this.ctx.beginPath();

    if (this.frames.frameGrid) {
      const {
        size: [fx, fy],
        dimensions: [dx, dy],
        names,
      } = this.frames.frameGrid;

      for (const [iy, row] of names.entries()) {
        if (iy > dy)
          throw new Error('sprite sheet does not match frame data, iy > dy');
        for (const [ix, name] of row.entries()) {
          if (ix > dx)
            throw new Error('sprite sheet does not match frame data, ix > dx');
          if (name === null) continue;
          this.ctx.rect(ix * fx, iy * fy, fx, fy);
          this.clipping[name] = [ix * fx, iy * fy, fx, fy];
        }
      }
    }

    if (this.frames.frameList) {
      for (const name in this.frames.frameList) {
        const [sx, sy, ex, ey] = this.frames.frameList[name];
        this.ctx.rect(sx, sy, ex - sx, ey - sy);
        this.clipping[name] = [sx, sy, ex - sx, ey - sy];
      }
    }

    if (this.frames.aliases) {
      for (const [alias, origName] of Object.entries(this.frames.aliases)) {
        const orig = this.clipping[origName];
        if (!orig) throw new Error('Original frame not found');
        this.clipping[alias] = orig;
      }
    }
    this.ctx.clip();
  }

  reset(): SpriteSheet {
    this.ctx.drawImage(this.sheet, 0, 0);
    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.colorMapping = undefined;

    return this;
  }

  applyDirectives(directiveStr: string): SpriteSheet {
    const directives = parseDirectives(directiveStr);
    const mutation = mapDirectives(directives);

    const apply = mutable(this.imageData);
    this.ctx.putImageData(apply(mutation), 0, 0);
    this.colorMapping = this.getColorMapping(mutation);

    return this;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    frame: string,
    sx: number,
    sy: number
  ): SpriteSheet {
    const fd = this.clipping[frame];
    if (!fd) throw new Error('frame not found in sprite sheet');

    ctx.save();
    ctx.beginPath();
    ctx.translate(sx, sy);
    ctx.rect(0, 0, fd[2], fd[3]);
    ctx.clip();
    ctx.drawImage(this.canvas, -fd[0], -fd[1]);
    ctx.restore();

    return this;
  }

  getPalette(): Palette {
    const palette: Palette = new Set();
    const d = this.imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      if (c || d[i + 3] > 0) palette.add(c);
    }
    return palette;
  }

  getColorMapping(mutation: Mutation): Map<number, number> {
    const im = this.ctx.createImageData(1, 1);
    const data = im.data;
    const colorMap = new Map<number, number>();

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
  }
}

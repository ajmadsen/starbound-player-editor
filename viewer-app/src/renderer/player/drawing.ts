export type Directive = string[];

export const splitHex = (hex: string): number[] => {
  const step = Math.floor(hex.length / 3);
  return (
    hex.match(new RegExp(`\\w{${step}}`, 'g'))?.map((s) => parseInt(s, 16)) || [
      0,
      0,
      0,
    ]
  );
};

export const parseDirectives = (strDirectives: string): Directive[] => {
  const split = strDirectives.split('?');
  return split
    .filter((dir) => dir !== '')
    .map((dir) => {
      const els = dir.split(';');
      if (els[0]?.includes('=')) {
        const [dir, arg0] = els[0].split('=', 2);
        els[0] = arg0;
        els.unshift(dir);
      }
      return els;
    });
};

export const replace = (args: string[]): Mutation => {
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

  return (data: Uint8ClampedArray): Uint8ClampedArray => {
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

export type Mutation =
  | ((data: Uint8ClampedArray) => Uint8ClampedArray)
  | undefined;
export const compose = (f: Mutation, g: Mutation): Mutation =>
  !g ? f : !f ? g : (x): Uint8ClampedArray => f(g(x));

export const mapDirectives = (directives: string[][]): Mutation => {
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

export const mutable = (image: ImageData) => (
  mutation: Mutation
): ImageData => {
  if (!mutation) return image;
  for (let i = 0; i < image.data.length; i += 4) {
    mutation(image.data.subarray(i, i + 4));
  }
  return image;
};

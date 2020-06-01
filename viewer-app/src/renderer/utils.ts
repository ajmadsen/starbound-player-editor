export const fmtColor = (color: string | number): string =>
  typeof color === 'string' ? color : '#' + color.toString(16).padStart(6, '0');

export const titleCase = (input: string): string =>
  input
    .split(' ')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');

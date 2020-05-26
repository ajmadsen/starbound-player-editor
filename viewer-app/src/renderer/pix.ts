export const pix = (color: string | number): HTMLDivElement => {
  if (typeof color === 'number') {
    color = color.toString(16).padStart(6, '0');
  }
  const box = document.createElement('div');
  box.className = 'pix';

  box.style.backgroundColor = `#${color}`;
  return box;
};

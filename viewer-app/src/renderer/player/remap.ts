type ColorMap = Record<number, number>;

export default class Remap {
  constructor(protected data: ImageData, protected colorMap: ColorMap) {}
}

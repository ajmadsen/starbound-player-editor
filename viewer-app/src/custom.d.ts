type FrameData = {
  frameGrid?: {
    size: [number, number];
    dimensions: [number, number];

    names: (string | null)[][];
  };
  aliases?: { [newName: string]: string };
  frameList?: {
    [name: string]: [number, number, number, number];
  };
};

type Identity = {
  bodyDirectives: string;
  color: [number, number, number];
  emoteDirectives: string;
  facialHairDirectives: string;
  facialHairGroup: string;
  facialHairType: string;
  facialMaskDirectives: string;
  facialMaskGroup: string;
  facialMaskType: string;
  gender: string;
  hairDirectives: string;
  hairGroup: string;
  hairType: string;
  name: string;
  personalityArmIdle: string;
  personalityArmOffset: [number, number];
  personalityHeadOffset: [number, number];
  personalityIdle: string;
  species: string;
};

declare module '*.frames' {
  const content: { default: FrameData };
  export default content;
}

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

declare module '*.frames' {
  const content: { default: FrameData };
  export default content;
}

declare module 'source-map-support';

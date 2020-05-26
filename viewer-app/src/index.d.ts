declare module '*.frames' {
  const content: { default: FrameData };
  export default content;
}

declare module 'source-map-support';

declare const SAFE_ORIGIN: string;

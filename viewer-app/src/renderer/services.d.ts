declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    starboundService: {
      getResource(string: name): Promise<any>;
      savePlayer(player: Player): Promise<void>;
    };
  }
}

export {};

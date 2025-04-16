/// <reference types="vite/client" />

// Declare MP3 module
declare module "*.mp3" {
  const src: string;
  export default src;
}

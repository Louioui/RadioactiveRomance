/** Connect the released audio and an existing hosted checkout without touching UI code. */
export const release = {
  title: "Candlelit Cage",
  artist: "Radioactive Romance",
  audioUrl:
    import.meta.env.VITE_AUDIO_URL || "/assets/Standing_Through_It_All.mp3",
  isPreview: false,
  checkoutUrl: import.meta.env.VITE_CHECKOUT_URL || "",
  secretUrl:
    import.meta.env.VITE_SECRET_DOWNLOAD_URL ||
    "/assets/shattered-canvas-wallpaper.webp",
  secretIsArtwork: !import.meta.env.VITE_SECRET_DOWNLOAD_URL,
};

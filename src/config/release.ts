/** Connect the released audio and an existing hosted checkout without touching UI code. */
export const release = {
  title: "Candlelit Cage",
  artist: "Radioactive Romance",
  audioUrl:
    import.meta.env.VITE_AUDIO_URL || "/assets/Standing_Through_It_All.mp3",
  tracks: [
    {
      title: "Standing Through It All",
      audioUrl:
        import.meta.env.VITE_AUDIO_URL || "/assets/Standing_Through_It_All.mp3",
    },
    { title: "Bleeding Out Empty", audioUrl: "/assets/Bleeding_Out_Empty.mp3" },
  ],
  isPreview: false,
  checkoutUrl: import.meta.env.VITE_CHECKOUT_URL || "",
  secretUrl:
    import.meta.env.VITE_SECRET_DOWNLOAD_URL ||
    "/assets/shattered-canvas-wallpaper.webp",
  secretIsArtwork: !import.meta.env.VITE_SECRET_DOWNLOAD_URL,
};

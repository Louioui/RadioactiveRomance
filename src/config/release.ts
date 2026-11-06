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
    { title: "Beneath The Iron Sky", audioUrl: "/assets/Beneath_The_Iron_Sky.mp3" },
    { title: "Heavy Blue", audioUrl: "/assets/Heavy_blue.mp3" },
    { title: "Paper Gods", audioUrl: "/assets/Paper_Gods.mp3" },
    { title: "Poison and Cure", audioUrl: "/assets/Poison_and_Cure.mp3" },
    { title: "Ribcage of Glass", audioUrl: "/assets/Ribcage_of_Glass.mp3" },
    { title: "Underneath The Stitches", audioUrl: "/assets/Underneath_The_Stitches.mp3" },
    { title: "Teeth Underneath", audioUrl: "/assets/Teeth_Underneath.mp3" },
    { title: "The Iron Monolith", audioUrl: "/assets/The_Iron_Monolith.mp3" },
    { title: "The Leash Has Snapped", audioUrl: "/assets/The_Leash_Has_Snapped.mp3" },
    { title: "Erasing Every Trace", audioUrl: "/assets/Erasing_Every_Trace.mp3" },
    { title: "Where The Wars Begin", audioUrl: "/assets/Where_The_Wars_Begin.mp3" },
    { title: "Where You Used To Be", audioUrl: "/assets/Where_You_Used_To_Be.mp3" },
    { title: "Tearing Through the Frame", audioUrl: "/assets/Tearing_Through_the_Frame.mp3" },
  ],
  isPreview: false,
  checkoutUrl: import.meta.env.VITE_CHECKOUT_URL || "",
  secretUrl:
    import.meta.env.VITE_SECRET_DOWNLOAD_URL ||
    "/assets/shattered-canvas-wallpaper.webp",
  secretIsArtwork: !import.meta.env.VITE_SECRET_DOWNLOAD_URL,
};

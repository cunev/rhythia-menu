// audioState.ts - Enhanced version
import { proxy } from "valtio";

// Create a more complete audio state store
export const audioState = proxy({
  url: "",
  musicName: "",
  coverUrl: "",
  isPlaying: false,
  currentTime: 0,
  duration: 0,

  // Add methods to control audio
  play: () => {},
  pause: () => {},
  seek: (time: number) => {},

  // Method to register audio controls
  registerAudio: (audioElement: HTMLAudioElement | null) => {
    if (!audioElement) return;

    // Update the control methods to use the actual audio element
    audioState.play = () => {
      audioElement.play().catch((err) => {
        console.error("Error playing audio:", err);
      });
      audioState.isPlaying = true;
    };

    audioState.pause = () => {
      audioElement.pause();
      audioState.isPlaying = false;
    };

    audioState.seek = (time: number) => {
      audioElement.currentTime = time;
      audioState.currentTime = time;
    };

    // Set up event listeners to update state
    audioElement.addEventListener("timeupdate", () => {
      console.log("timeupdate");
      audioState.currentTime = audioElement.currentTime;
    });

    audioElement.addEventListener("loadedmetadata", () => {
      audioState.duration = audioElement.duration;
    });

    audioElement.addEventListener("play", () => {
      audioState.isPlaying = true;
    });

    audioElement.addEventListener("pause", () => {
      audioState.isPlaying = false;
    });

    audioElement.addEventListener("ended", () => {
      audioState.isPlaying = false;
      audioState.currentTime = 0;
    });
  },
});

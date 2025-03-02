import { getCurrentWindow } from "@tauri-apps/api/window";
import { proxy, subscribe } from "valtio";
import { SoundSpaceMemoryMap } from "./utils/types/ssmm";

const STORAGE_KEY = "game_settings_default";

export const runtimeSettings = proxy({
  selectedSong: null as SoundSpaceMemoryMap | null,
  selectedSongImage: null as string | null,
  selectedSongMusic: null as string | null,
});

// Default settings
export const defaultSettings = {
  currentTab: "menu",

  sfxVolume: 1,
  musicVolume: 1,
  masterVolume: 1,
  hitSound: true,
  missSound: true,

  layoutZoom: 1,

  disablePausing: true,
  hitboxSize: 1.14,
  hitWindow: 55,
  counterSpeed: true,
  restartOnDeath: false,

  sensivity: 1,
  absoluteMode: false,
  cameraParallax: 5.4,
  spin: false,
  fov: 70,

  fullScreen: false,
  optimize: false,
};

// Load settings from localStorage or use defaults
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      return {
        ...defaultSettings,
        ...JSON.parse(savedSettings),
      };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return defaultSettings;
};

// Create the settings proxy
export const settings = proxy<typeof defaultSettings>({
  ...loadSettings(),
  currentTab: "maps",
  selectedSong: "",
});

// Subscribe to changes and save to localStorage
subscribe(settings, () => {
  getCurrentWindow().setFullscreen(settings.fullScreen);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
});

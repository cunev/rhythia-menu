// useElementSound.ts
import { useEffect, useRef } from "react";
import { Howl } from "howler";
import { useSnapshot } from "valtio";
import { settings } from "../settings";

interface ElementSoundOptions {
  elementType?: keyof HTMLElementTagNameMap | "*";
  className: string;
  clickSoundUrl?: string;
  hoverSoundUrl?: string;
  appearSoundUrl?: string;
  clickVolumeMultiplier?: number;
  hoverVolumeMultiplier?: number;
  appearVolumeMultiplier?: number;
  debounceTime?: number;
  /** Delay in ms before playing appear sound. Useful for staggered animations */
  appearDelay?: number;
}

interface ElementSoundControls {
  playClickSound: () => void;
  playHoverSound: () => void;
  playAppearSound: () => void;
}

const useElementSound = ({
  elementType = "*",
  className,
  clickSoundUrl,
  hoverSoundUrl,
  appearSoundUrl,
  clickVolumeMultiplier = 1,
  hoverVolumeMultiplier = 0.6,
  appearVolumeMultiplier = 0.7,
  debounceTime = 100,
  appearDelay = 0,
}: ElementSoundOptions): ElementSoundControls => {
  const clickSoundRef = useRef<Howl | null>(null);
  const hoverSoundRef = useRef<Howl | null>(null);
  const appearSoundRef = useRef<Howl | null>(null);
  const hoveredElementsRef = useRef<Set<Element>>(new Set());
  const appearedElementsRef = useRef<Set<Element>>(new Set());
  const { sfxVolume, masterVolume } = useSnapshot(settings);

  // Calculate final volume considering both master and sfx volumes
  const getFinalVolume = (multiplier: number) =>
    sfxVolume * masterVolume * multiplier;

  useEffect(() => {
    if (!className) {
      console.warn("useElementSound: No className provided");
      return;
    }

    // Initialize sounds
    if (clickSoundUrl) {
      clickSoundRef.current = new Howl({
        src: [clickSoundUrl],
        volume: getFinalVolume(clickVolumeMultiplier),
        preload: true,
      });
    }

    if (hoverSoundUrl) {
      hoverSoundRef.current = new Howl({
        src: [hoverSoundUrl],
        volume: getFinalVolume(hoverVolumeMultiplier),
        preload: true,
      });
    }

    if (appearSoundUrl) {
      appearSoundRef.current = new Howl({
        src: [appearSoundUrl],
        volume: getFinalVolume(appearVolumeMultiplier),
        preload: true,
      });
    }

    const playClickSound = (event: Event) => {
      if (clickSoundRef.current) {
        clickSoundRef.current.volume(getFinalVolume(clickVolumeMultiplier));
        clickSoundRef.current.play();
      }
    };

    const playHoverSound = (event: Event) => {
      const element = event.target as Element;

      if (!hoveredElementsRef.current.has(element) && hoverSoundRef.current) {
        hoverSoundRef.current.volume(getFinalVolume(hoverVolumeMultiplier));
        hoverSoundRef.current.play();
        hoveredElementsRef.current.add(element);

        setTimeout(() => {
          hoveredElementsRef.current.delete(element);
        }, debounceTime);
      }
    };

    const playAppearSound = (element: Element) => {
      if (!appearedElementsRef.current.has(element) && appearSoundRef.current) {
        appearedElementsRef.current.add(element);
        setTimeout(() => {
          appearSoundRef.current!.volume(
            getFinalVolume(appearVolumeMultiplier)
          );
          appearSoundRef.current!.play();
        }, appearDelay);
      }
    };

    const addSoundsToElements = () => {
      const selector =
        elementType === "*" ? `.${className}` : `${elementType}.${className}`;

      const elements = document.querySelectorAll(selector);

      elements.forEach((element) => {
        // Add click and hover listeners
        if (clickSoundRef.current) {
          element.addEventListener("click", playClickSound);
        }
        if (hoverSoundRef.current) {
          element.addEventListener("mouseenter", playHoverSound);
          element.addEventListener("touchstart", playHoverSound, {
            passive: true,
          });
        }

        // Play appear sound for new elements
        if (
          appearSoundRef.current &&
          !appearedElementsRef.current.has(element)
        ) {
          playAppearSound(element);
        }
      });
    };

    // Initial setup
    addSoundsToElements();

    // Handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          // Small delay to ensure elements are fully mounted
          setTimeout(addSoundsToElements, 0);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      const selector =
        elementType === "*" ? `.${className}` : `${elementType}.${className}`;

      const elements = document.querySelectorAll(selector);

      elements.forEach((element) => {
        if (clickSoundRef.current) {
          element.removeEventListener("click", playClickSound);
        }
        if (hoverSoundRef.current) {
          element.removeEventListener("mouseenter", playHoverSound);
          element.removeEventListener("touchstart", playHoverSound);
        }
      });

      observer.disconnect();

      [
        clickSoundRef.current,
        hoverSoundRef.current,
        appearSoundRef.current,
      ].forEach((sound) => {
        if (sound) sound.unload();
      });

      hoveredElementsRef.current.clear();
      appearedElementsRef.current.clear();
    };
  }, [
    elementType,
    className,
    clickSoundUrl,
    hoverSoundUrl,
    appearSoundUrl,
    sfxVolume,
    masterVolume,
    clickVolumeMultiplier,
    hoverVolumeMultiplier,
    appearVolumeMultiplier,
    debounceTime,
    appearDelay,
  ]);

  // Manual trigger functions
  const playClickSound = () => {
    if (clickSoundRef.current) {
      clickSoundRef.current.volume(getFinalVolume(clickVolumeMultiplier));
      clickSoundRef.current.play();
    }
  };

  const playHoverSound = () => {
    if (hoverSoundRef.current) {
      hoverSoundRef.current.volume(getFinalVolume(hoverVolumeMultiplier));
      hoverSoundRef.current.play();
    }
  };

  const playAppearSound = () => {
    if (appearSoundRef.current) {
      appearSoundRef.current.volume(getFinalVolume(appearVolumeMultiplier));
      appearSoundRef.current.play();
    }
  };

  return { playClickSound, playHoverSound, playAppearSound };
};

export default useElementSound;

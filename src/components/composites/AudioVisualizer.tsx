import React, { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { settings } from "../../settings";
import { audioState } from "../../audioState";

// Type definitions for Howler
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

// Shared audio context and source - move these outside the component so they can be shared
let sharedAudioContext: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let sharedAudioSource: MediaElementAudioSourceNode | null = null;

// Initialize shared audio resources if they don't exist
const initSharedAudio = (url: string) => {
  // Create audio context if it doesn't exist
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }

  // Resume the audio context if it's suspended
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch((err) => {
      console.error("Error resuming audio context:", err);
    });
  }

  // Create or update the audio element if URL changes
  if (!sharedAudioElement || sharedAudioElement.src !== url) {
    // Clean up existing audio
    if (sharedAudioSource) {
      try {
        sharedAudioSource.disconnect();
      } catch (err) {
        // Ignore disconnect errors
      }
    }

    // Create new audio element
    sharedAudioElement = new Audio(url);
    sharedAudioElement.crossOrigin = "anonymous";
    sharedAudioElement.loop = true;

    // Create and connect new audio source
    sharedAudioSource =
      sharedAudioContext.createMediaElementSource(sharedAudioElement);
    // Connect to destination so we can hear it
    sharedAudioSource.connect(sharedAudioContext.destination);

    // Register this audio element with the audioState
    audioState.registerAudio(sharedAudioElement);
  }

  return {
    context: sharedAudioContext,
    element: sharedAudioElement,
    source: sharedAudioSource,
  };
};

// Props to allow customizing each instance
interface AudioVisualizerProps {
  containerId?: string; // Optional ID for targeting specific container
  width?: string; // Optional width override
  height?: string; // Optional height override
  opacity?: number; // Optional opacity override
  zIndex?: number; // Optional z-index override
  smoothingFactor?: number; // Optional smoothing factor
  colorTop?: string; // Optional top gradient color
  colorBottom?: string; // Optional bottom gradient color
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  containerId,
  width = "100%",
  height = "100%",
  opacity = 0.7,
  zIndex = -1,
  smoothingFactor = 0.9,
  colorTop = "rgba(0, 217, 255, {OPACITY})",
  colorBottom = "rgba(130, 0, 255, {OPACITY})",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const previousDataRef = useRef<number[]>([]);

  const { url, isPlaying } = useSnapshot(audioState);
  const { musicVolume, masterVolume } = useSnapshot(settings);

  // Set up analyzer node connected to shared audio source
  useEffect(() => {
    if (!url) return;

    // Get shared audio resources
    const { context, element, source } = initSharedAudio(url);

    // Create analyzer for this instance
    if (!analyserRef.current) {
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }

    // Connect shared source to this analyzer
    if (source && analyserRef.current) {
      source.connect(analyserRef.current);
    }

    // Update volume
    if (element) {
      element.volume = musicVolume * masterVolume;
    }

    // Play/pause based on current state
    if (element) {
      if (isPlaying && element.paused) {
        element.play().catch((err) => {
          console.error("Error playing shared audio:", err);
        });
      } else if (!isPlaying && !element.paused) {
        element.pause();
      }
    }

    // Start visualization
    startVisualization();

    return () => {
      // Clean up
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      // Disconnect this analyzer only
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (err) {
          // Ignore disconnect errors
        }
      }

      // Note: We don't clean up shared resources here
      // Those should be handled by an app-level cleanup function
    };
  }, [url]);

  // Handle play/pause changes
  useEffect(() => {
    if (sharedAudioElement) {
      if (isPlaying && sharedAudioElement.paused) {
        sharedAudioElement.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
      } else if (!isPlaying && !sharedAudioElement.paused) {
        sharedAudioElement.pause();
      }
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (sharedAudioElement) {
      sharedAudioElement.volume = musicVolume * masterVolume;
    }
  }, [musicVolume, masterVolume]);

  // Reset smoothing data when URL changes
  useEffect(() => {
    previousDataRef.current = [];
  }, [url]);

  const startVisualization = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    // Determine container dimensions
    const resizeCanvas = () => {
      if (!canvas) return;

      if (containerId) {
        // If specific container ID was provided, use its dimensions
        const container = document.getElementById(containerId);
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        } else {
          // Fallback to window dimensions if container not found
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
      } else {
        // Use window dimensions by default
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      // Safety check
      if (!analyserRef.current || !dataArrayRef.current || !ctx || !canvas) {
        return;
      }

      // Request next frame
      animationRef.current = requestAnimationFrame(draw);

      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw visualization
      const barWidth = (canvas.width / dataArrayRef.current.length) * 2.5;
      let x = 0;

      // Initialize previous data array if it's empty
      if (previousDataRef.current.length === 0) {
        previousDataRef.current = Array.from(dataArrayRef.current);
      }

      for (let i = 0; i < dataArrayRef.current.length; i++) {
        // Apply smoothing by blending current and previous values
        const currentValue = dataArrayRef.current[i];
        const previousValue = previousDataRef.current[i] || 0;
        const smoothedValue =
          previousValue * smoothingFactor +
          currentValue * (1 - smoothingFactor);

        // Update previous data for next frame
        previousDataRef.current[i] = smoothedValue;

        const barHeight = smoothedValue * 2;

        // Create gradient color based on frequency
        const gradient = ctx.createLinearGradient(
          0,
          canvas.height - barHeight,
          0,
          canvas.height
        );

        // Replace opacity placeholder with actual opacity value
        const topColor = colorTop.replace(
          "{OPACITY}",
          (musicVolume * masterVolume).toString()
        );
        const bottomColor = colorBottom.replace(
          "{OPACITY}",
          (musicVolume * masterVolume * 0.5).toString()
        );

        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: width,
        height: height,
        zIndex: zIndex,
        opacity: opacity,
        pointerEvents: "none",
      }}
    />
  );
};

// This function should be called when your app is shutting down or unmounting
export const cleanupSharedAudio = () => {
  if (sharedAudioElement) {
    sharedAudioElement.pause();
    sharedAudioElement.src = "";
    audioState.registerAudio(null);
    sharedAudioElement = null;
  }

  if (sharedAudioSource) {
    try {
      sharedAudioSource.disconnect();
    } catch (err) {
      // Ignore disconnect errors
    }
    sharedAudioSource = null;
  }

  if (sharedAudioContext) {
    sharedAudioContext.close().catch((err) => {
      console.error("Error closing audio context:", err);
    });
    sharedAudioContext = null;
  }
};

export default AudioVisualizer;

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

const AudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const previousDataRef = useRef<number[]>([]);
  // Smoothing factor - higher = smoother but less responsive (between 0 and 1)
  const smoothingFactor = 0.9;

  const { url, isPlaying } = useSnapshot(audioState);
  const { musicVolume, masterVolume } = useSnapshot(settings);

  // Set up audio context and analyzer - only when URL changes
  useEffect(() => {
    // Only create a new audio context if URL exists and we don't already have one
    if (!url) {
      return;
    }

    // Create audio context only if we don't have one or it's closed
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }

    // Resume the audio context (needed for newer browsers)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch((err) => {
        console.error("Error resuming audio context:", err);
      });
    }

    // Create analyzer node
    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }

    // Connect analyzer to the audio context destination
    analyserRef.current.connect(audioContextRef.current.destination);

    // Create an audio element for analysis
    const audioElement = new Audio(url);
    audioElement.crossOrigin = "anonymous";
    audioElement.loop = true;
    audioElement.volume = musicVolume * masterVolume;
    audioElementRef.current = audioElement;

    // Register this audio element with the audioState so controls can use it
    audioState.registerAudio(audioElement);

    // Create a dedicated source for the analyzer
    const source =
      audioContextRef.current.createMediaElementSource(audioElement);
    source.connect(analyserRef.current);

    // Start playing but keep it silent (actual audio comes from Howler)
    if (isPlaying) {
      audioElement.play().catch((err) => {
        console.error("Error playing audio for analysis:", err);
      });
    }

    // Start visualization
    startVisualization();

    return () => {
      // Clean up
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      // Disconnect nodes but don't close context
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (err) {
          // Ignore disconnect errors
        }
      }

      // Stop and remove the audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
        // Unregister this audio element
        audioState.registerAudio(null);
        audioElementRef.current = null;
      }
    };
  }, [url]); // Only depend on url changes, not volume

  useEffect(() => {
    if (audioElementRef.current) {
      if (isPlaying && audioElementRef.current.paused) {
        audioElementRef.current.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
      } else if (!isPlaying && !audioElementRef.current.paused) {
        audioElementRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Separate effect to handle volume changes
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = musicVolume * masterVolume;
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

    // Ensure canvas dimensions match container
    const resizeCanvas = () => {
      if (canvas) {
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
        gradient.addColorStop(
          0,
          `rgba(0, 217, 255, ${musicVolume * masterVolume})`
        );
        gradient.addColorStop(
          1,
          `rgba(130, 0, 255, ${musicVolume * masterVolume * 0.5})`
        );

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
        width: "100%",
        height: "100%",
        zIndex: -1,
        opacity: 0.7,
        pointerEvents: "none",
      }}
    />
  );
};

export default AudioVisualizer;

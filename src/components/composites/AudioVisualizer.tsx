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

// Particle interface
interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  velocityX: number;
  velocityY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
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

  // Particle props
  enableParticles?: boolean; // Toggle particles on/off
  particleCount?: number; // Max number of particles to emit on beat
  particleSizeMin?: number; // Minimum particle size
  particleSizeMax?: number; // Maximum particle size
  particleLifeMin?: number; // Minimum particle lifetime in frames
  particleLifeMax?: number; // Maximum particle lifetime in frames
  particleColors?: string[]; // Array of colors for particles
  particleShape?: "square" | "circle"; // Shape of particles
  beatThreshold?: number; // Threshold for beat detection (0-255)
  beatDetectionRange?: [number, number]; // Frequency range for beat detection
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  containerId,
  width = "100%",
  height = "100%",
  opacity = 0.9,
  zIndex = -1,
  smoothingFactor = 0.9,
  colorTop = "rgba(0, 217, 255, {OPACITY})",
  colorBottom = "rgba(130, 0, 255, {OPACITY})",

  // Particle props with defaults
  enableParticles = true,
  particleCount = 15,
  particleSizeMin = 5,
  particleSizeMax = 20,
  particleLifeMin = 30,
  particleLifeMax = 120,
  particleColors = ["#ff0099", "#00ffff", "#00ff00", "#ffff00", "#ff9900"],
  particleShape = "square",
  beatThreshold = 180,
  beatDetectionRange = [0, 10], // Low frequency range for bass detection
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const previousDataRef = useRef<number[]>([]);
  const particles = useRef<Particle[]>([]);
  const beatDetectedRef = useRef<boolean>(false);
  const frameSinceLastBeatRef = useRef<number>(0);

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
    particles.current = [];
  }, [url]);

  // Create new particles on beat
  const createParticles = (canvas: HTMLCanvasElement) => {
    if (!enableParticles) return;

    // Create random number of particles up to max count
    const numToCreate = Math.floor(Math.random() * particleCount) + 1;

    for (let i = 0; i < numToCreate; i++) {
      // Random position in the lower half of the screen
      const x = Math.random() * canvas.width;
      const y = canvas.height - Math.random() * (canvas.height / 3);

      // Random size between min and max
      const size =
        Math.random() * (particleSizeMax - particleSizeMin) + particleSizeMin;

      // Random color from array
      const color =
        particleColors[Math.floor(Math.random() * particleColors.length)];

      // Random velocities
      const velocityX = (Math.random() - 0.5) * 4;
      const velocityY = -Math.random() * 4 - 2; // Upward motion

      // Random rotation
      const rotation = Math.random() * Math.PI * 2;
      const rotationSpeed = (Math.random() - 0.5) * 0.1;

      // Random lifetime
      const life =
        Math.random() * (particleLifeMax - particleLifeMin) + particleLifeMin;

      // Create particle
      particles.current.push({
        x,
        y,
        size,
        color,
        velocityX,
        velocityY,
        opacity: 1,
        rotation,
        rotationSpeed,
        life,
        maxLife: life,
      });
    }
  };

  // Update and draw particles
  const updateParticles = (ctx: CanvasRenderingContext2D) => {
    if (!enableParticles) return;

    // Loop through particles and update
    particles.current.forEach((particle, index) => {
      // Update position
      particle.x += particle.velocityX;
      particle.y += particle.velocityY;

      // Add some gravity effect
      particle.velocityY += 0.05;

      // Update rotation
      particle.rotation += particle.rotationSpeed;

      // Update life and opacity
      particle.life--;
      particle.opacity = particle.life / particle.maxLife;

      // Remove dead particles
      if (particle.life <= 0) {
        particles.current.splice(index, 1);
        return;
      }

      // Draw particle
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      if (particleShape === "square") {
        // Draw square
        const halfSize = particle.size / 2;
        ctx.fillRect(-halfSize, -halfSize, particle.size, particle.size);
      } else {
        // Draw circle
        ctx.beginPath();
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  };

  // Detect beats in the audio
  const detectBeat = (dataArray: Uint8Array) => {
    if (!enableParticles) return false;

    // Get average of frequencies in the detection range
    let total = 0;
    let count = 0;

    for (
      let i = beatDetectionRange[0];
      i <= beatDetectionRange[1] && i < dataArray.length;
      i++
    ) {
      total += dataArray[i];
      count++;
    }

    const average = count > 0 ? total / count : 0;

    // Check if above threshold and not too soon since last beat
    if (average > beatThreshold && frameSinceLastBeatRef.current > 10) {
      frameSinceLastBeatRef.current = 0;
      return true;
    }

    frameSinceLastBeatRef.current++;
    return false;
  };

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

      // Detect beat
      const beatDetected = detectBeat(dataArrayRef.current);

      // Create particles on beat
      if (beatDetected) {
        createParticles(canvas);
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles FIRST (so they appear behind bars)
      updateParticles(ctx);

      // Draw visualization bars
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
        const topColor = colorTop.replace("{OPACITY}", "0.8");
        const bottomColor = colorBottom.replace("{OPACITY}", "0.8");

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

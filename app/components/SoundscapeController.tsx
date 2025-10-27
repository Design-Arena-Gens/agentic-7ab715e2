"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SceneDescriptor } from "../lib/scenes";

type SoundscapeControllerProps = {
  isPlaying: boolean;
  mute: boolean;
  currentScene: SceneDescriptor;
  sceneProgress: number;
  onMutedChange(next: boolean): void;
};

type InternalNodes = {
  context: AudioContext;
  master: GainNode;
  wind: GainNode;
  shimmer: GainNode;
  pulse: GainNode;
};

const toneGains: Record<SceneDescriptor["tone"], { wind: number; shimmer: number; pulse: number }> = {
  cold: { wind: 0.9, shimmer: 0.15, pulse: 0.2 },
  transition: { wind: 0.6, shimmer: 0.4, pulse: 0.45 },
  warm: { wind: 0.3, shimmer: 0.6, pulse: 0.8 }
};

function createNoiseBuffer(context: AudioContext, color: "white" | "pink") {
  const bufferSize = context.sampleRate * 2;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "white") {
      data[i] = white;
    } else {
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
  }
  return buffer;
}

function initialiseContext(): InternalNodes {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.4;
  master.connect(context.destination);

  const windSource = context.createBufferSource();
  windSource.buffer = createNoiseBuffer(context, "pink");
  windSource.loop = true;

  const shimmerSource = context.createBufferSource();
  shimmerSource.buffer = createNoiseBuffer(context, "white");
  shimmerSource.loop = true;

  const wind = context.createGain();
  wind.gain.value = 0;
  const shimmer = context.createGain();
  shimmer.gain.value = 0;

  const shimmerFilter = context.createBiquadFilter();
  shimmerFilter.type = "highpass";
  shimmerFilter.frequency.value = 4500;

  const windFilter = context.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 400;
  windFilter.Q.value = 1.3;

  windSource.connect(windFilter).connect(wind).connect(master);
  shimmerSource.connect(shimmerFilter).connect(shimmer).connect(master);

  const pulseGain = context.createGain();
  pulseGain.gain.value = 0;
  const pulseOsc = context.createOscillator();
  pulseOsc.type = "sine";
  pulseOsc.frequency.value = 58;
  pulseOsc.connect(pulseGain).connect(master);

  windSource.start();
  shimmerSource.start();
  pulseOsc.start();

  return {
    context,
    master,
    wind,
    shimmer,
    pulse: pulseGain
  };
}

export function SoundscapeController({
  isPlaying,
  mute,
  currentScene,
  sceneProgress,
  onMutedChange
}: SoundscapeControllerProps) {
  const nodesRef = useRef<InternalNodes | null>(null);
  const [initialised, setInitialised] = useState(false);

  const ensureContext = useCallback(async () => {
    if (nodesRef.current) {
      return nodesRef.current;
    }

    const nodes = initialiseContext();
    nodesRef.current = nodes;
    setInitialised(true);
    return nodes;
  }, []);

  useEffect(() => {
    if (!isPlaying || mute) {
      return;
    }
    ensureContext()
      .then((nodes) => {
        if (nodes.context.state === "suspended") {
          return nodes.context.resume();
        }
        return undefined;
      })
      .catch(() => undefined);
  }, [ensureContext, isPlaying, mute]);

  useEffect(() => {
    const nodes = nodesRef.current;
    if (!nodes) {
      return;
    }

    if (mute || !isPlaying) {
      nodes.master.gain.cancelScheduledValues(nodes.context.currentTime);
      nodes.master.gain.setTargetAtTime(0.0001, nodes.context.currentTime, 0.4);
      return;
    }

    nodes.master.gain.cancelScheduledValues(nodes.context.currentTime);
    nodes.master.gain.setTargetAtTime(0.45, nodes.context.currentTime, 0.2);
  }, [isPlaying, mute]);

  useEffect(() => {
    const nodes = nodesRef.current;
    if (!nodes) {
      return;
    }
    const gains = toneGains[currentScene.tone];
    const { context } = nodes;
    const now = context.currentTime;

    // Subtle modulation for footstep crunch during ascent sequence.
    const crunchPulse =
      currentScene.id === "ascent" || currentScene.id === "summit"
        ? 0.35 + 0.4 * Math.sin(sceneProgress * Math.PI * 4)
        : 0;

    nodes.wind.gain.cancelScheduledValues(now);
    nodes.wind.gain.setTargetAtTime(gains.wind, now, 0.5);

    nodes.shimmer.gain.cancelScheduledValues(now);
    nodes.shimmer.gain.setTargetAtTime(gains.shimmer + crunchPulse * 0.3, now, 0.3);

    nodes.pulse.gain.cancelScheduledValues(now);
    nodes.pulse.gain.setTargetAtTime(gains.pulse + crunchPulse * 0.5, now, 0.4);
  }, [currentScene, sceneProgress]);

  useEffect(() => {
    if (initialised) {
      return;
    }
    const handleInteraction = () => {
      ensureContext().catch(() => undefined);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
    window.addEventListener("pointerdown", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [ensureContext, initialised]);

  const label = useMemo(
    () => (mute ? "Sound muted" : initialised ? "Soundscape active" : "Soundscape ready"),
    [mute, initialised]
  );

  return (
    <div className="soundscape">
      <button
        type="button"
        className="soundscape__toggle focus-outline"
        onClick={() => onMutedChange(!mute)}
      >
        <span aria-hidden="true">{mute ? "🔇" : "🔊"}</span>
        <span className="soundscape__label">{label}</span>
      </button>
    </div>
  );
}

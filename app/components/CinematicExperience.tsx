"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneTimeline } from "./SceneTimeline";
import { SoundscapeController } from "./SoundscapeController";
import { SCENE_SEQUENCE, TOTAL_DURATION_SECONDS } from "../lib/scenes";

type PlaybackState = "idle" | "running" | "complete";

type SceneState = {
  index: number;
  sceneElapsed: number;
  totalElapsed: number;
  progress: number;
};

const coldPalette = ["#0b1c2d", "#0f253b", "#132c47", "#0b1826"];
const transitionPalette = ["#16273a", "#2e4153", "#3d4d5c", "#2a3d45"];
const warmPalette = ["#4c3b26", "#b1874d", "#f0c77d", "#3d2a15"];

function gradientForTone(tone: "cold" | "transition" | "warm", progress: number) {
  const palette = tone === "cold" ? coldPalette : tone === "transition" ? transitionPalette : warmPalette;
  const [a, b, c, d] = palette;
  const eased = Math.pow(progress, 1.4);
  return `radial-gradient(circle at ${35 + eased * 40}% ${25 + eased * 50}%, ${a} 0%, ${b} 40%, ${c} 58%, ${d} 100%)`;
}

function getSceneState(elapsed: number): SceneState {
  let accumulator = 0;
  for (let index = 0; index < SCENE_SEQUENCE.length; index += 1) {
    const scene = SCENE_SEQUENCE[index];
    const start = accumulator;
    const end = accumulator + scene.duration;
    if (elapsed < end || index === SCENE_SEQUENCE.length - 1) {
      const clamped = Math.min(Math.max(elapsed - start, 0), scene.duration);
      const progress = scene.duration > 0 ? clamped / scene.duration : 0;
      return {
        index,
        sceneElapsed: clamped,
        totalElapsed: elapsed,
        progress
      };
    }
    accumulator = end;
  }
  return {
    index: SCENE_SEQUENCE.length - 1,
    sceneElapsed: SCENE_SEQUENCE.at(-1)?.duration ?? 0,
    totalElapsed: elapsed,
    progress: 1
  };
}

export function CinematicExperience() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [mute, setMute] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const isRunning = playbackState === "running";

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
      return;
    }

    const step = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;
      setElapsed((previousElapsed) => {
        const next = Math.min(previousElapsed + delta, TOTAL_DURATION_SECONDS);
        if (next >= TOTAL_DURATION_SECONDS) {
          setPlaybackState("complete");
        }
        return next;
      });
      if (playbackState === "running") {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning, playbackState]);

  const sceneState = useMemo(() => getSceneState(elapsed), [elapsed]);
  const currentScene = SCENE_SEQUENCE[sceneState.index];

  const cinematicGradient = useMemo(
    () => gradientForTone(currentScene.tone, sceneState.progress),
    [currentScene.tone, sceneState.progress]
  );

  const isIdle = playbackState === "idle";

  const handleStart = () => {
    setElapsed(0);
    setPlaybackState("running");
  };

  const handleReplay = () => {
    setElapsed(0);
    setPlaybackState("running");
  };

  const handlePauseToggle = () => {
    if (playbackState === "running") {
      setPlaybackState("idle");
    } else if (playbackState === "idle" && elapsed < TOTAL_DURATION_SECONDS) {
      setPlaybackState("running");
    }
  };

  return (
    <div className="experience" style={{ backgroundImage: cinematicGradient }}>
      <div className="grain-overlay" aria-hidden="true" />
      <div className="experience__frame">
        <header className="experience__header">
          <h1 className="experience__title">Summit of Dawn</h1>
          <p className="experience__subtitle">
            60-second Everest ascent captured through a RED Komodo and Zeiss Supreme Prime optics. Follow the climber
            from cobalt predawn to golden triumph.
          </p>
        </header>

        <div className="experience__viewer" role="presentation">
          <div
            className="experience__viewport"
            style={{
              transform: `scale(${1.02 + sceneState.progress * 0.12}) translateZ(0)`
            }}
          >
            <div className="experience__mountain">
              <div className="experience__ridge" aria-hidden="true" />
              <div className="experience__clouds" aria-hidden="true" />
              <div
                className="experience__climber"
                aria-hidden="true"
                style={{
                  transform: `translate3d(${35 + sceneState.progress * 30}%, ${45 - sceneState.progress * 20}%, 0)`
                }}
              >
                <div className="experience__climber-body" />
                <div className="experience__ice-axe" />
              </div>
            </div>
            <div className="experience__flare" aria-hidden="true" />
          </div>
          <div className="experience__hud" role="group" aria-label="Scene metadata">
            <div className="experience__hud-row">
              <span className="experience__scene-index">
                Scene {sceneState.index + 1} / {SCENE_SEQUENCE.length}
              </span>
              <span className="experience__duration">
                {sceneState.totalElapsed.toFixed(1)}s / {TOTAL_DURATION_SECONDS}s
              </span>
            </div>
            <div className="experience__hud-row experience__hud-row--wide">
              <div>
                <h2 className="experience__scene-title">{currentScene.label}</h2>
                <p className="experience__scene-description">{currentScene.description}</p>
              </div>
              <dl className="experience__tech">
                <div>
                  <dt>Camera Move</dt>
                  <dd>{currentScene.camera}</dd>
                </div>
                <div>
                  <dt>Visual Cue</dt>
                  <dd>{currentScene.visualCue}</dd>
                </div>
                <div>
                  <dt>Sound Design</dt>
                  <dd>{currentScene.audioCue}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="experience__controls">
          {isIdle && elapsed === 0 ? (
            <button type="button" className="experience__button focus-outline" onClick={handleStart}>
              Launch Film
            </button>
          ) : (
            <div className="experience__transport">
              <button type="button" className="experience__button focus-outline" onClick={handlePauseToggle}>
                {playbackState === "running" ? "Pause" : "Resume"}
              </button>
              <button type="button" className="experience__button focus-outline" onClick={handleReplay}>
                Restart
              </button>
            </div>
          )}
          <SoundscapeController
            isPlaying={playbackState === "running"}
            mute={mute}
            currentScene={currentScene}
            sceneProgress={sceneState.progress}
            onMutedChange={setMute}
          />
        </div>

        <SceneTimeline
          scenes={SCENE_SEQUENCE}
          elapsed={sceneState.totalElapsed}
          totalDuration={TOTAL_DURATION_SECONDS}
          currentScene={currentScene}
        />
      </div>
    </div>
  );
}

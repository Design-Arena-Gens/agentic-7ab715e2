"use client";

import clsx from "clsx";
import type { SceneDescriptor } from "../lib/scenes";

type SceneTimelineProps = {
  scenes: SceneDescriptor[];
  elapsed: number;
  totalDuration: number;
  currentScene: SceneDescriptor;
};

export function SceneTimeline({ scenes, elapsed, totalDuration, currentScene }: SceneTimelineProps) {
  return (
    <aside className="timeline">
      <div className="timeline__progress">
        <div className="timeline__progress-bar" style={{ width: `${(elapsed / totalDuration) * 100}%` }} />
        <div className="timeline__ticks">
          {scenes.map((scene, index) => {
            const sceneOffset =
              scenes
                .slice(0, index)
                .reduce((accumulator, current) => accumulator + current.duration, 0) / totalDuration;
            return <span key={scene.id} className="timeline__tick" style={{ left: `${sceneOffset * 100}%` }} />;
          })}
        </div>
      </div>
      <ul className="timeline__list" aria-label="Scene breakdown">
        {scenes.map((scene) => {
          const isActive = scene.id === currentScene.id;
          return (
            <li
              key={scene.id}
              className={clsx("timeline__item", {
                "timeline__item--active": isActive,
                "timeline__item--warm": scene.tone === "warm",
                "timeline__item--transition": scene.tone === "transition"
              })}
            >
              <div className="timeline__meta">
                <span className="timeline__scene">{scene.label}</span>
                <span className="timeline__duration">{scene.duration}s</span>
              </div>
              <p className="timeline__description">{scene.description}</p>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

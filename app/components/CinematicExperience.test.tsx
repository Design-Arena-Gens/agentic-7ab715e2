import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CinematicExperience } from "./CinematicExperience";
import { SCENE_SEQUENCE, TOTAL_DURATION_SECONDS } from "../lib/scenes";

class MockGainNode {
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn()
  };

  connect = vi.fn(() => this);
}

class MockBufferSource {
  loop = false;

  connect = vi.fn(() => new MockGainNode());

  start = vi.fn();
}

class MockOscillator {
  type: OscillatorType = "sine";

  frequency = {
    value: 0
  };

  connect = vi.fn(() => new MockGainNode());

  start = vi.fn();
}

class MockBiquadFilter {
  type: BiquadFilterType = "lowpass";

  frequency = {
    value: 0
  };

  Q = {
    value: 0
  };

  connect = vi.fn(() => new MockGainNode());
}

class MockAudioContext {
  readonly destination = {} as AudioDestinationNode;

  readonly sampleRate = 44100;

  state: AudioContextState = "running";

  currentTime = 0;

  createGain() {
    return new MockGainNode();
  }

  createBufferSource() {
    return new MockBufferSource();
  }

  createOscillator() {
    return new MockOscillator();
  }

  createBiquadFilter() {
    return new MockBiquadFilter();
  }

  createBuffer(_channels: number, length: number) {
    return {
      getChannelData: () => new Float32Array(length)
    } as unknown as AudioBuffer;
  }

  resume = vi.fn(async () => {
    this.state = "running";
  });
}

describe("CinematicExperience", () => {
  beforeAll(() => {
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("webkitAudioContext", MockAudioContext);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      return Number(setTimeout(() => callback(performance.now()), 16));
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
      clearTimeout(handle);
    });
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("exposes accurate total duration", () => {
    expect(TOTAL_DURATION_SECONDS).toBe(60);
    expect(SCENE_SEQUENCE).toHaveLength(8);
  });

  it("renders the initial cinematic frame", () => {
    render(<CinematicExperience />);
    expect(screen.getByText(/Summit of Dawn/i)).toBeInTheDocument();
    expect(screen.getByText(/Scene 1/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Launch Film/i })).toBeInTheDocument();
  });

  it("transitions to transport controls after launching", () => {
    render(<CinematicExperience />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Launch Film/i }));
      vi.advanceTimersByTime(48);
    });
    expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restart/i })).toBeInTheDocument();
  });
});

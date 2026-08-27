/** Semantic input actions shared by keyboard and touch controls. */
export type GameActions = {
  throttle: number;
  steer: number;
  boost: boolean;
  reset: boolean;
};

type KeyAction = "forward" | "backward" | "left" | "right" | "boost" | "reset";

const KEY_BINDINGS: Record<string, KeyAction> = {
  ArrowUp: "forward",
  KeyW: "forward",
  ArrowDown: "backward",
  KeyS: "backward",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "boost",
  KeyR: "reset",
};

export class InputManager {
  private held = new Set<KeyAction>();
  private tapped = new Set<KeyAction>();
  private touchCleanup: Array<() => void> = [];

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    event.preventDefault();
    if (!this.held.has(action)) this.tapped.add(action);
    this.held.add(action);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    event.preventDefault();
    this.held.delete(action);
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
    this.attachTouchControls();
  }

  private attachTouchControls() {
    document.querySelectorAll<HTMLElement>("[data-game-action]").forEach((button) => {
      const action = button.dataset.gameAction as KeyAction | undefined;
      if (!action) return;

      const start = (event: Event) => {
        event.preventDefault();
        if (!this.held.has(action)) this.tapped.add(action);
        this.held.add(action);
      };
      const end = (event: Event) => {
        event.preventDefault();
        this.held.delete(action);
      };

      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", end);
      button.addEventListener("pointerleave", end);
      button.addEventListener("pointercancel", end);
      this.touchCleanup.push(() => {
        button.removeEventListener("pointerdown", start);
        button.removeEventListener("pointerup", end);
        button.removeEventListener("pointerleave", end);
        button.removeEventListener("pointercancel", end);
      });
    });
  }

  read(): GameActions {
    const actionState = {
      throttle: (this.held.has("forward") ? 1 : 0) - (this.held.has("backward") ? 1 : 0),
      steer: (this.held.has("right") ? 1 : 0) - (this.held.has("left") ? 1 : 0),
      boost: this.tapped.has("boost"),
      reset: this.tapped.has("reset"),
    };
    this.tapped.clear();
    return actionState;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.touchCleanup.forEach((clean) => clean());
    this.touchCleanup = [];
    this.held.clear();
    this.tapped.clear();
  }
}


export const LANDED = "harmattan:landed";

// how long the start-up screen stays up before it starts to lift, and when it has gone. the stylesheet times .boot to match
export const LIFT_MS = 1600;
export const GONE_MS = 2200;

// true once the start-up screen has begun to lift, or was never put up
export const landed = () => document.documentElement.dataset.boot !== "";

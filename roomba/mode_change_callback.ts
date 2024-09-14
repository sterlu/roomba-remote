import { Mode } from './mode';

export interface ModeChangeCallback {
    (newMode: Mode): void;
}
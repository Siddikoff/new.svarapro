export interface GameEvent {
  name: string;
  payload?: any;
  to?: string | string[];
}

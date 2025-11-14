/**
 * Simple Event Emitter
 *
 * This file defines a basic EventEmitter class that allows for subscribing to events,
 * unsubscribing from events, and emitting events with associated data. This is used
 * within the messaging system (e.g., by ConnectionStateService) to broadcast
 * connection state changes.
 *
 * Main Class:
 * - EventEmitter: A simple event emitter implementation.
 *
 * Key Dependencies: None.
 *
 * @author AI Dungeon Master Team
 */

type EventCallback = (data: any) => void;

export class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  public on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(callback);
  }

  public off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  public emit(event: string, data: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

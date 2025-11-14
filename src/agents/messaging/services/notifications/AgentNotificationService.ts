export type NotificationLevel = 'info' | 'warning' | 'error';

export interface AgentNotification {
  level: NotificationLevel;
  title: string;
  description?: string;
}

type NotificationListener = (notification: AgentNotification) => void;

export class AgentNotificationService {
  private listeners: Set<NotificationListener> = new Set();

  public notify(notification: AgentNotification): void {
    if (this.listeners.size === 0) {
      const { level, title, description } = notification;
      // eslint-disable-next-line no-console
      console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'](
        `[AgentNotification] ${title}${description ? ` - ${description}` : ''}`,
      );
      return;
    }

    for (const listener of this.listeners) {
      listener(notification);
    }
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

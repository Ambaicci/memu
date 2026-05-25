'use client';

export type NotificationType = 
  | 'new_memu'
  | 'mention'
  | 'reply'
  | 'call_reminder'
  | 'board_invite';

interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  silent?: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private permissionRequested = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      this.permissionRequested = true;
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  async send(data: NotificationData): Promise<void> {
    if (typeof window === 'undefined') return;
    
    if (!('Notification' in window)) return;
    
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.icon || '/logo.svg',
      silent: data.silent || false,
      tag: `${data.type}-${Date.now()}`,
    });

    if (data.url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = data.url;
        notification.close();
      };
    }

    setTimeout(() => notification.close(), 5000);
  }

  // Convenience methods
  async newMemu(from: string, subject: string, memuId: string) {
    await this.send({
      type: 'new_memu',
      title: `📬 New memu from ${from}`,
      body: subject,
      url: `/?panel=inmemus&memu=${memuId}`,
    });
  }

  async mention(boardName: string, mentionedBy: string, message: string, boardId: string) {
    await this.send({
      type: 'mention',
      title: `💬 ${mentionedBy} mentioned you in ${boardName}`,
      body: message.length > 100 ? message.slice(0, 100) + '...' : message,
      url: `/?panel=boards&board=${boardId}`,
    });
  }

  async reply(memuSubject: string, replier: string, memuId: string) {
    await this.send({
      type: 'reply',
      title: `↩️ ${replier} replied to "${memuSubject}"`,
      body: `View the conversation`,
      url: `/?panel=inmemus&memu=${memuId}`,
    });
  }

  async callReminder(callTitle: string, minutes: number, callId: string) {
    await this.send({
      type: 'call_reminder',
      title: `📞 Call reminder: ${callTitle}`,
      body: `Starting in ${minutes} minutes`,
      url: `/?panel=confer&call=${callId}`,
    });
  }

  async boardInvite(boardName: string, invitedBy: string, boardId: string) {
    await this.send({
      type: 'board_invite',
      title: `🔒 ${invitedBy} invited you to ${boardName}`,
      body: 'Join the board to collaborate',
      url: `/?panel=boards&board=${boardId}`,
    });
  }
}

export const notifications = new NotificationService();
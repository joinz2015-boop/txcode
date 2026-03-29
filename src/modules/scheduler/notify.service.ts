export type NotifyType = 'message' | 'email';

export interface NotifyOptions {
  taskName: string;
  result: string;
}

export class NotifyService {
  async send(type: NotifyType, options: NotifyOptions): Promise<void> {
    switch (type) {
      case 'message':
        await this.sendMessage(options);
        break;
      case 'email':
        await this.sendEmail(options);
        break;
    }
  }

  private async sendMessage(options: NotifyOptions): Promise<void> {
    console.log(`[Notify] Message notification for task "${options.taskName}": ${options.result.substring(0, 100)}...`);
  }

  private async sendEmail(options: NotifyOptions): Promise<void> {
    console.log(`[Notify] Email notification for task "${options.taskName}": ${options.result.substring(0, 100)}...`);
  }
}

export const notifyService = new NotifyService();

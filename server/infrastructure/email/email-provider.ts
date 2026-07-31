export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<boolean>;
}

export class MockEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<boolean> {
    // Production-ready abstraction hook (logs for transport inspection)
    console.log(`[EmailProvider] Sending email to ${message.to}: ${message.subject}`);
    return true;
  }
}

export const emailService = new MockEmailProvider();

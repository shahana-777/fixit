/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'user' | 'assistant';

export type Language = 'en-US' | 'kn-IN' | 'hi-IN';

export enum ConfusionType {
  CONCEPT = 'concept',
  CALCULATION = 'calculation',
  LANGUAGE = 'language',
  NONE = 'none',
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  attachments?: string[];
  imageUrl?: string;
  visualPrompt?: string;
  confusionMeta?: {
    type: ConfusionType;
    explanation: string;
  };
}

export interface ChatSession {
  messages: Message[];
  isOnline: boolean;
  isTyping: boolean;
}

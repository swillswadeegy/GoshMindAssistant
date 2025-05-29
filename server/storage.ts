import { conversations, type Conversation, type InsertConversation, type Message } from "@shared/schema";

export interface IStorage {
  getConversation(sessionId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(sessionId: string, messages: Message[]): Promise<Conversation>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private currentId: number;

  constructor() {
    this.conversations = new Map();
    this.currentId = 1;
  }

  async getConversation(sessionId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conv) => conv.sessionId === sessionId,
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentId++;
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.sessionId, conversation);
    return conversation;
  }

  async updateConversation(sessionId: string, messages: Message[]): Promise<Conversation> {
    const existing = await this.getConversation(sessionId);
    if (!existing) {
      throw new Error("Conversation not found");
    }

    const updated: Conversation = {
      ...existing,
      messages,
      updatedAt: new Date(),
    };
    
    this.conversations.set(sessionId, updated);
    return updated;
  }
}

export const storage = new MemStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, type ChatResponse, type Message } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Chat endpoint - handles sending messages to OpenAI Assistant
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = chatRequestSchema.parse(req.body);

      const assistantId = process.env.OPENAI_ASSISTANT_ID;
      if (!assistantId) {
        return res.status(500).json({ 
          message: "Assistant ID not configured. Please provide your OpenAI Assistant ID." 
        });
      }

      // Get or create conversation
      let conversation = await storage.getConversation(sessionId);
      if (!conversation) {
        conversation = await storage.createConversation({
          sessionId,
          messages: [],
        });
      }

      // Add user message to conversation
      const userMessage: Message = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...conversation.messages, userMessage];

      // Create thread
      const thread = await openai.beta.threads.create();
      
      // Add message to thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message,
      });

      // Create and poll run
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistantId,
      });

      if (run.status === 'completed') {
        // Get messages
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
          const assistantResponse = assistantMessage.content[0].text.value;

          // Add assistant message to conversation
          const assistantReplyMessage: Message = {
            role: "assistant",
            content: assistantResponse,
            timestamp: new Date().toISOString(),
          };

          const finalMessages = [...updatedMessages, assistantReplyMessage];
          await storage.updateConversation(sessionId, finalMessages);

          const response: ChatResponse = {
            response: assistantResponse,
            sessionId,
          };

          res.json(response);
        } else {
          throw new Error("No valid assistant response found");
        }
      } else {
        throw new Error(`Assistant run failed with status: ${run.status}`);
      }

    } catch (error) {
      console.error("Chat error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: error.errors 
        });
      }

      if (error instanceof Error) {
        return res.status(500).json({ 
          message: "Failed to process chat request: " + error.message 
        });
      }

      res.status(500).json({ 
        message: "An unexpected error occurred while processing your request" 
      });
    }
  });

  // Get conversation history
  app.get("/api/conversation/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const conversation = await storage.getConversation(sessionId);
      
      if (!conversation) {
        return res.json({ messages: [] });
      }

      res.json({ messages: conversation.messages });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ 
        message: "Failed to retrieve conversation history" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

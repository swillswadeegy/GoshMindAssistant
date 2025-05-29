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

      // Prepare messages for OpenAI API
      const openaiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call OpenAI API
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are GOSH-MIND, a helpful AI assistant. Provide clear, concise, and helpful responses to user questions. Be friendly and conversational while maintaining professionalism."
          },
          ...openaiMessages
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const assistantResponse = completion.choices[0]?.message?.content;
      if (!assistantResponse) {
        throw new Error("No response from OpenAI");
      }

      // Add assistant message to conversation
      const assistantMessage: Message = {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];

      // Update conversation in storage
      await storage.updateConversation(sessionId, finalMessages);

      const response: ChatResponse = {
        response: assistantResponse,
        sessionId,
      };

      res.json(response);

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

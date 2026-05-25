// src/lib/ai/groq.ts
import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
}

export const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});
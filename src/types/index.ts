// src/types/index.ts
export * from "./client";
export * from "./message";
export * from "./conversation";
export * from "./conversation-analysis";
export * from "./attendant";
export * from "./service";
export * from "./unit";
export * from "./executive-dashboard-data";
export * from "./filters";
export * from "./analyze-conversation-input";

export type ClientWithConversations = import("./client").Client & {
    conversations: Array<
        import("./conversation").Conversation & {
        messages: import("./message").Message[];
        conversation_analysis: import("./conversation-analysis").ConversationAnalysis | null;
    }
    >;
};
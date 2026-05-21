// src/lib/analysis/sessionizeConversations.ts
import type { Message } from "@/types";

const DEFAULT_CONVERSATION_GAP_HOURS = 24;

export type ConversationMessageGroup = {
    started_at: string;
    ended_at: string;
    messages: Message[];
};

export function sessionizeConversations(
    messages: Message[],
    gapHours = DEFAULT_CONVERSATION_GAP_HOURS
): ConversationMessageGroup[] {
    if (messages.length === 0) return [];

    const sortedMessages = [...messages].sort(
        (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    );

    const groups: ConversationMessageGroup[] = [];

    let currentGroup: Message[] = [sortedMessages[0]];

    for (let i = 1; i < sortedMessages.length; i++) {
        const previousMessage = sortedMessages[i - 1];
        const currentMessage = sortedMessages[i];

        const gapInHours = getHoursDifference(
            previousMessage.sent_at,
            currentMessage.sent_at
        );

        if (gapInHours >= gapHours) {
            groups.push(createGroup(currentGroup));
            currentGroup = [currentMessage];
        } else {
            currentGroup.push(currentMessage);
        }
    }

    groups.push(createGroup(currentGroup));

    return groups;
}

function createGroup(messages: Message[]): ConversationMessageGroup {
    return {
        started_at: messages[0].sent_at,
        ended_at: messages[messages.length - 1].sent_at,
        messages,
    };
}

function getHoursDifference(start: string, end: string): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    return (endTime - startTime) / (1000 * 60 * 60);
}
// scripts/test-analyze.mjs

const response = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        conversation_id: "test-conversation-1",
        client_id: "test-client-1",
        started_at: "2026-05-22T10:00:00.000Z",
        ended_at: "2026-05-22T10:20:00.000Z",
        attendant_id: null,
        unit_id: null,
        service_id: null,
        conversationText:
            "[22/05/2026, 10:00] Cliente: Oi, queria saber sobre consulta online\n" +
            "[22/05/2026, 10:02] Atendente: Claro! A consulta online funciona como uma triagem inicial.\n" +
            "[22/05/2026, 10:05] Cliente: E quanto custa?\n" +
            "[22/05/2026, 10:06] Atendente: O valor é R$ 200.\n" +
            "[22/05/2026, 10:08] Cliente: Entendi, vou pensar.",
    }),
});

const json = await response.json();

console.log(JSON.stringify(json, null, 2));
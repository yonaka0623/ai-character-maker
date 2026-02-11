import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
    const body = await req.json();
    const { messages, character } = body;

    // system（人格）
    const systemPrompt = `
あなたは「${character.name}」というキャラクターです。
性格：${character.personality}
口調は自然で親しみやすく、日本語で会話してください。
`;

    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 300,
        messages: [
            { role: "system", content: systemPrompt },
            ...messages,
        ],
    });

    const reply = completion.choices[0].message.content;

    return NextResponse.json({ reply });
}

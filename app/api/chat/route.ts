import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const userText = String(body?.userText ?? "");
        const personality = String(body?.personality ?? "");

        console.log("[/api/chat] userText =", userText);

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: "OPENAI_API_KEY が設定されていません（.env.local を確認）" },
                { status: 500 }
            );
        }

        const resp = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: (personality
                        ? `あなたは次のキャラクターとして自然に会話してください。\n\n${personality}\n\n`
                        : "あなたは親切なAIキャラクターです。\n\n")
                        + `返答は必ず以下のJSON形式のみで返してください。それ以外のテキストは含めないでください。
                    {"emotion": "happy | sad | angry | embarrassing | neutral のいずれか", "text": "セリフ"}`
                },
                {
                    role: "user",
                    content: userText
                }
            ],
            response_format: { type: "json_object" },
        });

        const raw = resp.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        const text = parsed.text ?? "";
        const emotion = parsed.emotion ?? "neutral";
        console.log("[/api/chat] emotion =", emotion);

        return NextResponse.json({ text, emotion });

    } catch (e: any) {
        console.error("[/api/chat] ERROR =", e);
        return NextResponse.json(
            { error: e?.message ?? String(e) },
            { status: 500 }
        );
    }
}
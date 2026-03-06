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

        // ✅ OpenAIを最小で呼ぶ（まずはここだけ）
        const resp = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: personality
                        ? `あなたは次のキャラクターとして自然に会話してください。\n\n${personality}`
                        : "あなたは親切なAIキャラクターです。"
                },
                {
                    role: "user",
                    content: userText
                }
            ],
        });

        const text = resp.choices?.[0]?.message?.content ?? "";

        return NextResponse.json({ text });
    } catch (e: any) {
        console.error("[/api/chat] ERROR =", e);
        return NextResponse.json(
            { error: e?.message ?? String(e) },
            { status: 500 }
        );
    }
}
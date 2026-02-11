import {
    PollyClient,
    SynthesizeSpeechCommand,
} from "@aws-sdk/client-polly";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ← PollyはNode実行が安全（Edgeにしない）

const polly = new PollyClient({
    region: process.env.AWS_REGION || "ap-northeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

function streamToBuffer(stream: any): Promise<Buffer> {
    // AWS SDK v3 の AudioStream を Buffer に変換
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

export async function POST(req: Request) {
    try {
        // envチェック
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            return NextResponse.json(
                { error: "AWSの環境変数が未設定です" },
                { status: 500 }
            );
        }

        const body = await req.json();
        const text = (body?.text ?? "").toString().trim();
        const voiceId = (body?.voiceId ?? "").toString().trim();

        if (!text) {
            return NextResponse.json({ error: "text が空です" }, { status: 400 });
        }
        if (!voiceId) {
            return NextResponse.json({ error: "voiceId が空です" }, { status: 400 });
        }

        // Pollyで音声合成
        const cmd = new SynthesizeSpeechCommand({
            OutputFormat: "mp3",
            Text: text,
            VoiceId: voiceId as any, // Mizuki / Takumi など
            //Engine: "neural",        // Mizuki等はneural対応が多い（ダメならstandardに変える）
            // TextType: "text",
            // LanguageCode: "ja-JP", // voiceIdが日本語なら不要でもOK
        });

        const result = await polly.send(cmd);

        if (!result.AudioStream) {
            return NextResponse.json(
                { error: "AudioStream が取得できませんでした" },
                { status: 500 }
            );
        }

        const audioBuffer = await streamToBuffer(result.AudioStream);
        const audioBytes = new Uint8Array(audioBuffer);

        // mp3をそのまま返す（ブラウザ側で再生できる）
        return new NextResponse(audioBytes, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-store",
            },
        });
    } catch (err: any) {
        console.error("TTS error:", err);
        return NextResponse.json(
            {
                error: "TTSに失敗しました",
                detail: err?.message ?? String(err),
            },
            { status: 500 }
        );
    }
}

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const LISTEN_TIMEOUT_SEC = 30;

export function useVoice() {
    const [voiceState, setVoiceState] = useState<VoiceState>("idle");
    const [secondsLeft, setSecondsLeft] = useState(LISTEN_TIMEOUT_SEC);
    const [recognizedText, setRecognizedText] = useState("");
    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // リスニング終了時にタイマーをクリア
    useEffect(() => {
        if (voiceState !== "listening") {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setSecondsLeft(LISTEN_TIMEOUT_SEC);
        }
    }, [voiceState]);

    // Amazon Polly で音声再生
    const speak = useCallback(async (text: string, voiceId: string) => {
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voiceId }),
            });
            if (!res.ok) throw new Error("TTS failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            await new Promise<void>((resolve, reject) => {
                audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
                audio.onerror = () => reject(new Error("Audio playback error"));
                audio.play().catch(reject);
            });
        } catch (e) {
            throw e;
        }
    }, []);

    // Web Speech API で音声認識開始
    const startListening = useCallback((onResult: (text: string) => void) => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        setRecognizedText("");
        setVoiceState("listening");
        setSecondsLeft(LISTEN_TIMEOUT_SEC);

        // カウントダウンタイマー
        timerRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    recognitionRef.current?.stop();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const rec = new SpeechRecognition();
        rec.lang = "ja-JP";
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (e: any) => {
            let interim = "";
            let final = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    final += t;
                } else {
                    interim += t;
                }
            }
            setRecognizedText(final || interim);
            if (final) onResult(final);
        };

        recognitionRef.current = rec;
        rec.start();
    }, []);

    // 音声認識停止
    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setVoiceState("idle");
    }, []);

    return {
        voiceState,
        setVoiceState,
        secondsLeft,
        recognizedText,
        speak,
        startListening,
        stopListening,
    };
}

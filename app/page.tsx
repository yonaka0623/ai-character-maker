"use client";

import { useVoice } from "@/hooks/useVoice";
import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";


// Footer は client-only で読み込む
const Footer = dynamic(() => import("./components/Footer"), {
  ssr: false,
});

type Character = {
  name: string;
  personality: string;
  voiceId: string;
  shortPersonality?: string;
  iconUrl?: string | null;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const searchParams = useSearchParams();
  const urlCharacterId = searchParams.get("characterId");

  // ✅ Home側で「確定したキャラID」
  const [resolvedCharacterId, setResolvedCharacterId] = useState<string | null>(null);

  // ✅ Home側で「キャラ情報」
  const [character, setCharacter] = useState<Character | null>(null);

  const {
    voiceState,
    setVoiceState,
    secondsLeft,
    recognizedText,
    speak,
    startListening,
    stopListening,
  } = useVoice();


  const handleLogout = async () => {
    await signOut(auth);
  };

  const [aiText, setAiText] = useState<string>("");
  const isProcessingRef = useRef(false);

  const threadId =
    user && resolvedCharacterId ? `${user.uid}_${resolvedCharacterId}` : null;

  // 1) ログイン状態を監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  // 2) URLのcharacterIdがあればそれを採用。なければ users/{uid}.selectedCharacterId を読む
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // URLがあればそれを優先
    if (urlCharacterId) {
      setResolvedCharacterId(urlCharacterId);
      return;
    }

    // URLになければFirestoreから復元
    const ref = doc(db, "users", currentUser.uid);
    getDoc(ref).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.selectedCharacterId) {
        setResolvedCharacterId(data.selectedCharacterId);
        // URLにも反映（任意だけどおすすめ）
        router.replace(`/?characterId=${data.selectedCharacterId}`);
      }
    });
  }, [urlCharacterId, router]);

  // 3) resolvedCharacterId が決まったら characters/{id} を読んでキャラ情報を取得
  useEffect(() => {
    if (!resolvedCharacterId) {
      setCharacter(null);
      return;
    }

    const ref = doc(db, "characters", resolvedCharacterId);
    getDoc(ref).then((snap) => {
      if (!snap.exists()) {
        setCharacter(null);
        return;
      }
      const data = snap.data() as any;

      setCharacter({
        name: data.name ?? "",
        personality: data.personality ?? "",
        voiceId: data.voiceId ?? "",
        shortPersonality: data.shortPersonality,
        iconUrl: data.iconUrl ?? null,
      });
    });
  }, [resolvedCharacterId]);

  const sendVoiceMessage = async (text: string) => {
    if (!user) {
      console.log("sendVoiceMessage: userがない");
      return;
    }
    if (!resolvedCharacterId) {
      console.log("sendVoiceMessage: resolvedCharacterIdがない");
      return;
    }
    if (!character) {
      console.log("sendVoiceMessage: characterがない");
      return;
    }
    if (!threadId) {
      console.log("sendVoiceMessage: threadIdがない");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      console.log("sendVoiceMessage: textが空");
      return;
    }

    if (isProcessingRef.current) {
      console.log("sendVoiceMessage: isProcessingRef.current が true");
      return;
    }
    isProcessingRef.current = true;

    try {
      console.log("① sendVoiceMessage 開始:", trimmed);

      setVoiceState("thinking");
      setAiText("");

      console.log("② thread保存 開始");
      await setDoc(
        doc(db, "threads", threadId),
        {
          userId: user.uid,
          characterId: resolvedCharacterId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("② thread保存 完了");

      console.log("③ user発言 保存 開始");
      await addDoc(collection(db, "threads", threadId, "messages"), {
        role: "user",
        content: trimmed,
        createdAt: serverTimestamp(),
      });
      console.log("③ user発言 保存 完了");

      console.log("④ /api/chat 呼び出し開始");
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: resolvedCharacterId,
          personality: character.personality,
          userText: trimmed,
          threadId,
        }),
      });

      console.log("④ /api/chat status =", chatRes.status);

      if (!chatRes.ok) {
        const errText = await chatRes.text();
        console.log("CHAT ERROR:", errText);
        setAiText("chat error: " + errText);
        return;
      }

      const chatData = await chatRes.json();
      console.log("⑤ chatData =", chatData);

      const assistantText: string = chatData.text ?? chatData.assistantText ?? "";
      const emotion: string = chatData.emotion ?? "neutral";
      console.log("⑤ emotion =", emotion);
      console.log("⑤ assistantText =", assistantText);

      if (!assistantText.trim()) {
        console.log("CHAT returned empty text");
        setAiText("AIの返答が空でした");
        return;
      }

      setAiText(assistantText);
      console.log("⑥ AI返答表示 完了");

      console.log("⑦ AI発言 保存 開始");
      await addDoc(collection(db, "threads", threadId, "messages"), {
        role: "assistant",
        content: assistantText,
        createdAt: serverTimestamp(),
      });
      console.log("⑦ AI発言 保存 完了");

      console.log("⑧ TTS再生 開始");
      setVoiceState("speaking");
      await speak(assistantText, character.voiceId);
      console.log("⑧ TTS再生 完了");

    } catch (e: any) {
      console.error("sendVoiceMessage ERROR =", e);
      setAiText("エラー: " + (e?.message ?? String(e)));
    } finally {
      setVoiceState("idle");
      isProcessingRef.current = false;
    }
  };


  return (
    <main className="mx-auto w-full max-w-md min-h-screen bg-gray-100 flex flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="p-4 bg-white shadow flex items-center justify-between">
        <h1 onClick={handleLogout} className="text-xl font-semibold cursor-pointer">
          AI Friends
        </h1>

        {user ? (
          <button
            onClick={() => router.push("/settings")}
            className="px-3 py-2 text-sm bg-gray-200 rounded-md"
          >
            設定
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md"
          >
            ログイン / 新規登録
          </button>
        )}
      </header>

      {/* ===== キャラ表示エリア ===== */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full h-full bg-white rounded-xl shadow flex flex-col items-center justify-center text-gray-600 gap-2">
          {resolvedCharacterId ? (
            <>
              <div className="text-sm text-gray-400">選択中キャラ</div>
              <div className="text-lg font-semibold">
                {character ? character.name : "読み込み中…"}
              </div>
              <div className="text-xs text-gray-400">
                characterId: {resolvedCharacterId}
              </div>
              <div className="text-xs text-gray-400">
                voiceId: {character?.voiceId ?? "(未取得)"}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                ここが「3D表示エリア」になる予定
              </div>
            </>
          ) : (
            <>
              キャラが選択されていません
              <br />
              下の「キャラ一覧」から選んでください
            </>
          )}
        </div>
      </div>

      {/* ===== 音声操作（仮） ===== */}
      {resolvedCharacterId && character ? (
        <div className="p-4">
          <div className="mb-2 text-sm text-gray-600">
            状態：
            {voiceState === "idle" && "待機"}
            {voiceState === "listening" && `聞いてる…（残り${secondsLeft}秒）`}
            {voiceState === "thinking" && "考え中…"}
            {voiceState === "speaking" && "話し中…"}
          </div>

          <button
            className={`w-full py-3 rounded-md text-lg select-none ${voiceState === "listening" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
              }`}
            onPointerDown={() => startListening((text) => sendVoiceMessage(text))}
            onPointerUp={stopListening}
            onPointerCancel={stopListening}

            disabled={voiceState === "thinking" || voiceState === "speaking"}
          >
            {voiceState === "listening" ? "話し中（離すと送信）" : "押して話す"}
          </button>

          <p className="mt-2 text-xs text-gray-500">
            ※ いまはUIだけ。次に音声認識（STT）をつなげる。
          </p>

          {recognizedText && (
            <div className="mt-3 p-3 bg-white rounded-md shadow text-sm text-gray-700">
              <div className="text-xs text-gray-400 mb-1">認識結果（送信前）</div>
              <div className="whitespace-pre-wrap">{recognizedText}</div>
            </div>
          )}

          {aiText && (
            <div className="mt-3 p-3 bg-white rounded-md shadow text-sm text-gray-700">
              <div className="text-xs text-gray-400 mb-1">AIの返答</div>
              <div className="whitespace-pre-wrap">{aiText}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-500">
          ※ キャラを選択すると音声ボタンが使えます
        </div>
      )}


      {/* ===== フッター ===== */}
      <Footer characterId={resolvedCharacterId} />
    </main>
  );
}

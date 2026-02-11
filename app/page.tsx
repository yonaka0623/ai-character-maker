"use client";

import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

  type VoiceState = "idle" | "listening" | "thinking" | "speaking";

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [secondsLeft, setSecondsLeft] = useState<number>(10);
  const timerRef = useRef<number | null>(null);


  const handleLogout = async () => {
    await signOut(auth);
  };

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

  //ここまで

  const startListeningUI = () => {
    if (voiceState !== "idle") return;

    setVoiceState("listening");
    setSecondsLeft(10);

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopListeningUI(); // 10秒で自動停止
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopListeningUI = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setVoiceState("idle");
    setSecondsLeft(10);
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
            className={`w-full py-3 rounded-md text-lg select-none ${voiceState === "listening"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
              }`}
            onMouseDown={startListeningUI}
            onMouseUp={stopListeningUI}
            onMouseLeave={stopListeningUI}
            onTouchStart={startListeningUI}
            onTouchEnd={stopListeningUI}
            disabled={voiceState !== "idle"}
          >
            {voiceState === "listening" ? "話し中（離すと送信）" : "押して話す"}
          </button>

          <p className="mt-2 text-xs text-gray-500">
            ※ いまはUIだけ。次に音声認識（STT）をつなげます。
          </p>
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

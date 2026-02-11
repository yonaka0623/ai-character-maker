"use client";

import { auth, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";


export default function CharaCreatePage() {
    const router = useRouter();

    const handleCreateCharacter = async () => {
        if (!auth.currentUser) {
            alert("ログインしてください");
            return;
        }

        try {
            await addDoc(collection(db, "characters"), {
                name,
                personality,
                shortPersonality,
                voiceId,
                iconUrl: null, // 今は未設定
                creator: auth.currentUser.uid,
                createdAt: serverTimestamp(),
            });

            // 作成後はキャラ一覧へ
            router.push("/chara_list");
        } catch (error) {
            console.error("キャラ作成エラー:", error);
            alert("キャラの作成に失敗しました");
        }
    };


    // ===== 入力状態 =====
    const [name, setName] = useState("");
    const [personality, setPersonality] = useState("");
    const [shortPersonality, setshortPersonality] = useState("");
    const [voiceId, setVoiceId] = useState("");
    const [iconFile, setIconFile] = useState<File | null>(null);

    return (
        <main className="mx-auto w-full max-w-md min-h-screen bg-gray-100 flex flex-col">
            {/* ===== ヘッダー ===== */}
            <header className="p-4 bg-white shadow flex items-center">
                <button
                    onClick={() => router.push("/chara_list")}
                    className="mr-4 text-sm text-blue-500"
                >
                    ← キャラ一覧
                </button>
                <h1 className="text-xl font-semibold">キャラ作成</h1>
            </header>

            {/* ===== メイン ===== */}
            <div className="flex-1 p-4 space-y-5 overflow-y-auto">
                {/* キャラ名 */}
                <div>
                    <label className="block text-sm font-medium mb-1">キャラの名前</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例：ミカ"
                        className="w-full px-3 py-2 rounded-md border"
                    />
                </div>

                {/* 性格 一言説明 */}
                <div>
                    <label className="block text-sm font-medium mb-1">性格の一言説明</label>
                    <input
                        type="text"
                        value={shortPersonality}
                        onChange={(e) => setshortPersonality(e.target.value)}
                        placeholder="例：明るく活発な女の子"
                        className="w-full px-3 py-2 rounded-md border"
                    />
                </div>

                {/* 性格 */}
                <div>
                    <label className="block text-sm font-medium mb-1">性格</label>
                    <textarea
                        value={personality}
                        onChange={(e) => setPersonality(e.target.value)}
                        placeholder="例：優しくて少し照れ屋。相手の話をよく聞いてくれる。"
                        className="w-full px-3 py-2 rounded-md border h-32 resize-none"
                    />
                </div>

                {/* 声（Polly） */}
                <div>
                    <label className="block text-sm font-medium mb-1">声</label>
                    <select
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border"
                    >
                        <option value="">選択してください</option>
                        <option value="Mizuki">Mizuki（女性・日本語）</option>
                        <option value="Takumi">Takumi（男性・日本語）</option>
                        <option value="Kazuha">Kazuha（女性・日本語）</option>
                        <option value="Tomoko">Tomoko（女性・日本語）</option>
                    </select>
                </div>

                {/* 容姿（アイコン） */}
                <div>
                    <label className="block text-sm font-medium mb-1">容姿（アイコン）</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setIconFile(e.target.files ? e.target.files[0] : null)
                        }
                        className="w-full text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        ※ 今はアイコンのみ。3Dモデルは後で設定できます
                    </p>
                </div>
            </div>

            {/* ===== 作成ボタン ===== */}
            <div className="p-4">
                <button
                    onClick={handleCreateCharacter}
                    className="w-full py-3 bg-green-500 text-white rounded-md text-lg disabled:bg-gray-300"
                    disabled={!name || !shortPersonality || !personality || !voiceId}
                >
                    作成
                </button>

            </div>
        </main>
    );
}

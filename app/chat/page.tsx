"use client";

import { auth, db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";



type Message = {
    id: string;
    role: "user" | "assistant";
    text: string;
};

export default function ChatPage() {
    const router = useRouter();
    const [resolvedCharacterId, setResolvedCharacterId] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const characterId = searchParams.get("characterId");


    const [character, setCharacter] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // 🔑 threadId はコンポーネント内で計算
    /*
    A && B
  ? C
  : null;
  👉
   A も B も OK → C
   どちらか NG → null
    */
    const threadId =
        auth.currentUser && resolvedCharacterId
            ? `${auth.currentUser.uid}_${resolvedCharacterId}`
            : null;


    // ===== キャラ情報取得 =====
    /*useEffect(() => {
    実行したい処理
    }, [監視する値]);
    */

    // ===== キャラ情報取得 =====
    useEffect(() => {
        if (!resolvedCharacterId) return;

        const ref = doc(db, "characters", resolvedCharacterId);
        getDoc(ref).then((snap) => {
            if (snap.exists()) {
                setCharacter(snap.data());
            }
        });
    }, [resolvedCharacterId]);


    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // URL に characterId があるならそれを使う
        if (characterId) {
            setResolvedCharacterId(characterId);
            return;
        }

        // URL に無い場合は Firestore から取得
        const ref = doc(db, "users", user.uid);
        getDoc(ref).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.selectedCharacterId) {
                    setResolvedCharacterId(data.selectedCharacterId);
                    // URL も同期（重要）
                    router.replace(`/chat?characterId=${data.selectedCharacterId}`);
                }
            }
        });
    }, [characterId, router]);


    // ===== messages 購読 =====
    useEffect(() => {
        if (!threadId) return;

        const q = query(
            collection(db, "threads", threadId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Message[] = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    role: data.role,
                    text: data.text,
                };
            });
            setMessages(list);
        });

        return () => unsubscribe();
    }, [threadId]);

    // ===== 自動スクロール =====
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ===== 送信 =====
    const handleSend = async () => {
        if (!input.trim() || !auth.currentUser || !threadId || !character) return;

        const userMessage = input;
        setInput("");

        // threads 本体
        await setDoc(
            doc(db, "threads", threadId),
            {
                creatorUid: auth.currentUser.uid,
                characterId: resolvedCharacterId,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        const messagesRef = collection(db, "threads", threadId, "messages");

        // user
        await addDoc(messagesRef, {
            role: "user",
            text: userMessage,
            createdAt: serverTimestamp(),
        });

        // API 用 messages
        const apiMessages = [
            ...messages.map((m) => ({
                role: m.role,
                content: m.text,
            })),
            { role: "user", content: userMessage },
        ];

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: apiMessages,
                character: {
                    name: character.name,
                    personality: character.personality,
                },
            }),
        });

        const data = await res.json();

        // assistant
        await addDoc(messagesRef, {
            role: "assistant",
            text: data.reply,
            createdAt: serverTimestamp(),
        });
    };

    return (
        <main className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto">
            <header className="p-4 bg-white shadow flex items-center">
                <button
                    onClick={() => router.push("/chara_list")}
                    className="mr-3 text-sm text-blue-500"
                >
                    ←
                </button>
                <h1 className="text-lg font-semibold">
                    {character ? character.name : "読み込み中…"}
                </h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${msg.role === "user"
                                ? "bg-green-500 text-white rounded-br-sm"
                                : "bg-white text-gray-800 rounded-bl-sm"
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-full text-sm"
                    placeholder="メッセージを入力"
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={!character}
                />
                <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-green-500 text-white rounded-full text-sm"
                    disabled={!character}
                >
                    送信
                </button>
            </div>
        </main>
    );
}

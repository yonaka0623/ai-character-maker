"use client";

import { auth, db } from "@/lib/firebase";
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const Footer = dynamic(() => import("../components/Footer"), {
    ssr: false,
});

type Character = {
    id: string;
    name: string;
    shortPersonality: string;
    iconUrl: string | null;
    createdAt: any;
};

export default function CharaListPage() {
    const router = useRouter();

    const [resolvedCharacterId, setResolvedCharacterId] = useState<string | null>(null);

    const [characters, setCharacters] = useState<Character[]>([]);
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
    const searchParams = useSearchParams();
    const selectedCharacterId = searchParams.get("characterId");

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // URL にあればそれを使う
        if (selectedCharacterId) {
            setResolvedCharacterId(selectedCharacterId);
            return;
        }

        // URL に無ければ Firestore から読む
        const ref = doc(db, "users", user.uid);
        onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.selectedCharacterId) {
                    setResolvedCharacterId(data.selectedCharacterId);
                }
            }
        });
    }, [selectedCharacterId]);



    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (!user) return;

            const q = query(
                collection(db, "characters"),
                where("creator", "==", user.uid),
                orderBy("createdAt", sortOrder)
            );

            const unsubscribeSnap = onSnapshot(q, (snapshot) => {
                const list: Character[] = snapshot.docs.map((doc) => {
                    const data = doc.data();

                    return {
                        id: doc.id,
                        name: data.name,
                        shortPersonality: data.shortPersonality,
                        iconUrl: data.iconUrl ?? null,
                        createdAt: data.createdAt,
                    };
                });

                setCharacters(list);
            });

            return () => unsubscribeSnap();
        });

        return () => unsubscribeAuth();
    }, [sortOrder]);



    return (
        <main className="mx-auto w-full max-w-md min-h-screen bg-gray-100 flex flex-col">
            {/* ===== ヘッダー ===== */}
            <header className="p-4 bg-white shadow">
                <h1 className="text-xl font-semibold text-center">キャラ一覧</h1>

                {/* 並び替え */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => setSortOrder("desc")}
                        className={`flex-1 py-1 rounded-md text-sm ${sortOrder === "desc"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200"
                            }`}
                    >
                        新しい順
                    </button>
                    <button
                        onClick={() => setSortOrder("asc")}
                        className={`flex-1 py-1 rounded-md text-sm ${sortOrder === "asc"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200"
                            }`}
                    >
                        古い順
                    </button>
                </div>
            </header>

            {/* ===== キャラ一覧 ===== */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {characters.length === 0 && (
                    <p className="text-center text-gray-500 text-sm">
                        まだキャラが作成されていません
                    </p>
                )}
                {characters.map((chara) => {
                    const isSelected = resolvedCharacterId === chara.id;

                    return (
                        <div
                            key={chara.id}
                            onClick={async () => {
                                const user = auth.currentUser;
                                if (!user) return;

                                await setDoc(
                                    doc(db, "users", user.uid),
                                    { selectedCharacterId: chara.id },
                                    { merge: true }
                                );

                                router.push(`/chara_list?characterId=${chara.id}`);
                            }}
                            className={
                                "p-3 rounded-lg shadow flex gap-3 items-center cursor-pointer transition " +
                                (isSelected
                                    ? "bg-blue-50 border-2 border-blue-500"
                                    : "bg-white hover:bg-gray-50")
                            }
                        >
                            {/* ===== アイコン ===== */}
                            <div className="w-14 h-14 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
                                {chara.iconUrl ? (
                                    <img
                                        src={chara.iconUrl}
                                        alt={chara.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                        NO IMAGE
                                    </div>
                                )}
                            </div>

                            {/* ===== テキスト ===== */}
                            <div className="flex-1">
                                <p className="font-semibold flex items-center gap-2">
                                    {chara.name}
                                    {isSelected && (
                                        <span className="text-blue-500 text-xs">●</span>
                                    )}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {chara.shortPersonality}
                                </p>
                            </div>

                            {/* ===== 編集ボタン（右端） ===== */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // ← 超重要
                                    router.push(`/chara_fix?characterId=${chara.id}`);
                                }}
                                className="ml-auto px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            >
                                編集
                            </button>
                        </div>
                    );
                })}


            </div>

            {/* ===== 作成ボタン ===== */}
            <div className="p-4">
                <button
                    onClick={() => router.push("/chara_create")}
                    className="w-full py-3 bg-green-500 text-white rounded-md text-lg"
                >
                    ＋ 新しいキャラを作成
                </button>
            </div>
            <Footer characterId={resolvedCharacterId} />


        </main>
    );
}

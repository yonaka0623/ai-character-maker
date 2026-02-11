"use client";

import { useRouter } from "next/navigation";

type FooterProps = {
    characterId: string | null;
};

export default function Footer({ characterId }: FooterProps) {
    const router = useRouter();

    return (
        <nav className="p-4 bg-white shadow flex gap-2">
            <button
                onClick={() => router.push("/")}
                className="flex-1 py-2 bg-gray-300 rounded-md"
            >
                ホーム
            </button>

            <button
                onClick={() => {
                    if (characterId) {
                        router.push(`/chat?characterId=${characterId}`);
                    } else {
                        router.push("/chat");
                    }
                }}
                className="flex-1 py-2 bg-green-500 text-white rounded-md"
            >
                チャット
            </button>

            <button
                onClick={() => {
                    if (characterId) {
                        router.push(`/chara_list?characterId=${characterId}`);
                    } else {
                        router.push("/chara_list");
                    }
                }}
                className="flex-1 py-2 bg-red-300 rounded-md"
            >
                キャラ一覧
            </button>

            <button
                onClick={() => router.push("/memory")}
                className="flex-1 py-2 bg-gray-300 rounded-md"
            >
                思い出 / 詳細
            </button>
        </nav>
    );
}

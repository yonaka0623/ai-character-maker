"use client";

import { auth } from "@/lib/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";



export default function LoginPage() {
    const router = useRouter();

    // login / register の切り替え
    //useState(...) → [ 現在の値, 値を変えるための命令 ](初期値)
    const [mode, setMode] = useState<"login" | "register">("login");

    // 共通
    /*
    「覚えておきたい値 A と、
     その値を入れ替えるための専用スイッチ setA を、
     セットで作る」
     userState("")は最初は空の文字を入れておくという意味
    */
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 新規登録用
    const [nickname, setNickname] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    //async は「時間がかかる処理を待つための印」
    /*try {
      // うまくいきそうな処理
    } catch {
      // 失敗したときにやること
    }
    */
    //await の意味「この処理が終わるまで、次に進まないで待って
    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (error) {
            alert("ログインに失敗しました");
        }
    };

    const handleRegister = async () => {
        if (password !== passwordConfirm) {
            alert("パスワードが一致しません");
            return;
        }

        /*async → 待つ処理があるよ
          await → ここで待って
          try → とりあえずやってみる
          catch → 失敗したらこっち
        */

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // ※ nickname は次に Firestore に保存する
            router.push("/");
        } catch (error) {
            alert("新規登録に失敗しました");
        }
    };

    return (
        <main className="mx-auto w-full max-w-md min-h-screen bg-gray-100 flex flex-col">
            {/* ===== ヘッダー ===== */}
            <header className="p-4 bg-white shadow flex items-center">
                <button
                    onClick={() => router.push("/")}
                    className="mr-4 text-sm text-blue-500"
                >
                    ← ホーム
                </button>
                <h1 className="text-lg font-semibold mx-auto">
                    ログイン / 新規登録
                </h1>
            </header>

            {/* ===== メイン ===== */}
            <div className="flex-1 p-6 bg-white">

                {mode === "login" ? (
                    <>
                        <h2 className="text-xl font-semibold mb-4">ログイン</h2>

                        <input
                            type="email"
                            placeholder="メールアドレス"
                            className="w-full mb-3 p-3 border rounded"
                            value={email}
                            //「この入力欄に文字が打たれるたびに、その文字を email という箱に保存する」
                            //(e)➡「入力が変わったときの情報一式」e=event(出来事)
                            //e.target➡どの入力欄で起きたか value➡今その入力欄に入っている文字
                            //setEmail➡emailという箱のの中身を入れ替える
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="パスワード"
                            className="w-full mb-4 p-3 border rounded"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button
                            onClick={handleLogin}
                            className="w-full py-3 bg-blue-500 text-white rounded-md"
                        >
                            ログイン
                        </button>

                        <div className="my-6 border-t" />

                        <p
                            onClick={() => setMode("register")}
                            className="text-center text-blue-500 underline cursor-pointer"
                        >
                            新規の方はこちら
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-semibold mb-4">新規登録</h2>

                        <input
                            type="text"
                            placeholder="ニックネーム"
                            className="w-full mb-3 p-3 border rounded"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />

                        <input
                            type="email"
                            placeholder="メールアドレス"
                            className="w-full mb-3 p-3 border rounded"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="パスワード"
                            className="w-full mb-3 p-3 border rounded"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <input
                            type="password"
                            placeholder="パスワード（確認）"
                            className="w-full mb-4 p-3 border rounded"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                        />

                        <div className="text-sm mb-4">
                            <span className="text-blue-500 underline cursor-pointer">
                                利用規約
                            </span>
                            {" ・ "}
                            <span className="text-blue-500 underline cursor-pointer">
                                プライバシーポリシー
                            </span>
                        </div>

                        <button
                            onClick={handleRegister}
                            className="w-full py-3 bg-green-500 text-white rounded-md"
                        >
                            新規登録
                        </button>

                        <div className="my-6 border-t" />
                        <p
                            onClick={() => setMode("login")}
                            className="text-center text-blue-500 underline cursor-pointer"
                        >
                            ログインはこちら
                        </p>
                    </>
                )}
            </div>
        </main>
    );
}

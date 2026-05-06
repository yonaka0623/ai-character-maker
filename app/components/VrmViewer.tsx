"use client";

import { VRMExpressionPresetName, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// APIから返るemotionとVRM expressionの対応
const EMOTION_MAP: Record<string, VRMExpressionPresetName> = {
    happy: VRMExpressionPresetName.Happy,
    sad: VRMExpressionPresetName.Sad,
    angry: VRMExpressionPresetName.Angry,
    neutral: VRMExpressionPresetName.Neutral,
};

type Props = {
    modelUrl: string;
    emotion?: "happy" | "sad" | "angry" | "neutral";
};

export default function VrmViewer({ modelUrl, emotion = "neutral" }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const vrmRef = useRef<any>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // シーン初期化 & VRM読み込み
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // --- renderer ---
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;

        // --- scene ---
        const scene = new THREE.Scene();

        // --- camera ---
        const camera = new THREE.PerspectiveCamera(
            30,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            20
        );
        camera.position.set(0, 1.4, 3); // キャラの顔あたりを映す

        // --- ライト ---
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(1, 1, 1);
        scene.add(directional);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // --- VRM読み込み ---
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        loader.load(
            modelUrl,
            (gltf) => {
                const vrm = gltf.userData.vrm;
                vrmRef.current = vrm;
                scene.add(vrm.scene);

                // VRoidモデルはZ軸が逆なので回転
                vrm.scene.rotation.y = Math.PI;
            },
            undefined,
            (error) => console.error("VRM load error:", error)
        );

        // --- アニメーションループ ---
        const clock = new THREE.Clock();
        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            vrmRef.current?.update(delta);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            renderer.dispose();
        };
    }, [modelUrl]);

    // emotion変化 → 表情切り替え
    useEffect(() => {
        const vrm = vrmRef.current;
        if (!vrm?.expressionManager) return;

        // 全表情をリセット
        Object.values(VRMExpressionPresetName).forEach((name) => {
            vrm.expressionManager.setValue(name, 0);
        });

        // 対応する表情をセット
        const expressionName = EMOTION_MAP[emotion] ?? VRMExpressionPresetName.Neutral;
        vrm.expressionManager.setValue(expressionName, 1.0);
    }, [emotion]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: "block" }}
        />
    );
}
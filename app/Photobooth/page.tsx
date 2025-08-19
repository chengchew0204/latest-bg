"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function PhotoboothPage() {
  const [bgVersion, setBgVersion] = useState<number>(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = async () => {
    if (cameraActive) return; // Prevent multiple calls
    
    setError(null);
    setCameraActive(true);
    setCameraReady(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      
      // Wait for video to be ready
      v.onloadedmetadata = () => {
        setCameraReady(true);
      };
      
      await v.play();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Camera permission denied");
      setCameraActive(false);
      setCameraReady(false);
    }
  };

  // Stop camera to release resources
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  };

  useEffect(() => {
    // Optional: auto-start camera (comment out if undesired)
    // startCamera();
    return () => stopCamera();
  }, []);

  // Capture a frame -> compress -> upload
  const captureAndUpload = async () => {
    setBusy(true);
    setError(null);
    try {
      const video = videoRef.current!;
      if (!video || !cameraReady || !video.videoWidth) {
        throw new Error("Camera is not ready");
      }

      // Scale to max width 1920 while keeping aspect ratio
      const maxW = 1920;
      const scale = Math.min(1, maxW / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, w, h);

      // Encode to JPEG (client-side)
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.85)
      );

      const form = new FormData();
      form.append("file", blob, "capture.jpg");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }
      // Bump version to bust cache on /bg
      const json = await res.json();
      setBgVersion(json.version ?? Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="photobooth-container">
      {/* Background */}
      <div 
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(/bg?v=${bgVersion})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: -1,
        }}
      />

      {/* Back button */}
      <div className="back-button">
        <Link href="/">Back</Link>
      </div>

      {/* Take photo button */}
      <div className="take-photo-button">
        <button onClick={captureAndUpload} disabled={busy || !cameraReady}>
          {busy ? "..." : cameraReady ? "Take photo" : "Starting camera..."}
        </button>
      </div>

      {/* Camera view */}
      <div className="camera-container">
        <video
          ref={videoRef}
          playsInline
          muted
          className="camera-video"
          onClick={!cameraActive ? startCamera : undefined}
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        {!cameraActive && (
          <div className="camera-placeholder" onClick={startCamera}>
            <span>Tap to start camera</span>
          </div>
        )}
        {cameraActive && !cameraReady && (
          <div className="camera-loading">
            <span>Starting camera...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-overlay">
          {error}
        </div>
      )}

      <style jsx>{`
        .photobooth-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .back-button {
          position: fixed;
          top: 30px;
          left: 30px;
          z-index: 100;
        }

        .back-button a {
          color: #fff;
          text-decoration: none;
          font-size: 18px;
          font-weight: 700;
          transition: opacity 0.3s ease;
        }

        .back-button a:hover {
          opacity: 0.7;
        }

        .take-photo-button {
          position: fixed;
          top: 30px;
          right: 30px;
          z-index: 100;
        }

        .take-photo-button button {
          color: #fff;
          background: rgba(0, 0, 0, 0.8);
          border: none;
          border-radius: 25px;
          padding: 12px 24px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .take-photo-button button:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.9);
        }

        .take-photo-button button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .camera-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }

        .camera-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .camera-placeholder:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        .camera-placeholder span {
          color: #fff;
          font-size: 24px;
          font-weight: 400;
        }

        .camera-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          z-index: 10;
        }

        .camera-loading span {
          color: #fff;
          font-size: 20px;
          font-weight: 400;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .error-overlay {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 0, 0, 0.9);
          color: #fff;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 100;
        }

        @media (max-width: 768px) {
          .back-button,
          .take-photo-button {
            top: 20px;
          }
          
          .back-button {
            left: 20px;
          }
          
          .take-photo-button {
            right: 20px;
          }
          
          .back-button a,
          .take-photo-button button {
            font-size: 16px;
          }
          
          .camera-placeholder span {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}

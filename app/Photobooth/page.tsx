"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

export default function PhotoboothPage() {
  const [bgVersion, setBgVersion] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
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
  }, []); // Remove cameraActive dependency to prevent infinite loop

  // Stop camera to release resources
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  // Initialize client-side state and start camera
  useEffect(() => {
    setBgVersion(Date.now());
    
    // Start camera after a short delay to ensure component is ready
    const timer = setTimeout(() => {
      startCamera();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  // Capture a frame and freeze video
  const takePhoto = async () => {
    setError(null);
    try {
      const video = videoRef.current!;
      if (!video || !cameraReady || !video.videoWidth) {
        throw new Error("Camera is not ready");
      }

      // Pause the video to create freeze effect
      video.pause();

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

      // Get image data as base64 for upload
      const imageData = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImageData(imageData);
      setPhotoTaken(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  // Upload the captured photo
  const uploadPhoto = async () => {
    if (!capturedImageData) return;
    
    setBusy(true);
    setError(null);
    setUploadSuccess(false);
    
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImageData);
      const blob = await response.blob();

      const form = new FormData();
      form.append("file", blob, "capture.jpg");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }
      
      const json = await res.json();
      const newVersion = json.version ?? Date.now();
      setBgVersion(newVersion);
      setUploadSuccess(true);
      
      // Force cache invalidation by updating localStorage
      localStorage.setItem('bg-version', newVersion.toString());
      
      // Show success message and redirect after a delay
      setTimeout(() => {
        window.location.href = `/?v=${newVersion}`;
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  // Cancel photo and return to camera
  const cancelPhoto = () => {
    setPhotoTaken(false);
    setCapturedImageData(null);
    setError(null);
    
    // Resume video playback
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.play();
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

      {/* Take photo button (only when not taken) */}
      {!photoTaken && (
        <div className="take-photo-button">
          <button onClick={takePhoto} disabled={!cameraReady}>
            Take photo
          </button>
        </div>
      )}

      {/* Upload/Cancel buttons overlay (only when photo taken) */}
      {photoTaken && (
        <div className="photo-actions-overlay">
          <div className="action-buttons">
            <button onClick={uploadPhoto} disabled={busy} className="upload-btn">
              {uploadSuccess ? "Success! Redirecting..." : busy ? "Uploading..." : "Upload"}
            </button>
            <button onClick={cancelPhoto} disabled={busy} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Camera view */}
      <div className="camera-container">
        <video
          ref={videoRef}
          playsInline
          muted
          className="camera-video"
          style={{ 
            display: cameraActive ? 'block' : 'none',
            filter: photoTaken ? 'none' : 'none' // Keep video visible when photo taken (frozen)
          }}
        />
        {!cameraReady && !photoTaken && (
          <div className="camera-loading">
            <span>Loading...</span>
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

        .photo-actions-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          background: rgba(0, 0, 0, 0.3);
        }

        .action-buttons {
          display: flex;
          gap: 20px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }

        .upload-btn, .cancel-btn {
          color: #fff;
          border: none;
          border-radius: 25px;
          padding: 12px 24px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .upload-btn {
          background: rgba(0, 150, 0, 0.8);
        }

        .upload-btn:hover:not(:disabled) {
          background: rgba(0, 150, 0, 0.9);
        }

        .cancel-btn {
          background: rgba(150, 0, 0, 0.8);
        }

        .cancel-btn:hover:not(:disabled) {
          background: rgba(150, 0, 0, 0.9);
        }

        .upload-btn:disabled, .cancel-btn:disabled {
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

        .photo-preview {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        .captured-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
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
          .take-photo-button,
          .action-buttons {
            top: 20px;
          }
          
          .back-button {
            left: 20px;
          }
          
          .take-photo-button,
          .action-buttons {
            right: 20px;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 8px;
          }
          
          .back-button a,
          .take-photo-button button,
          .upload-btn,
          .cancel-btn {
            font-size: 16px;
            padding: 10px 20px;
          }
          
          .camera-loading span {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}

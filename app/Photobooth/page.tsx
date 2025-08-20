"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";

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
    
    // Fix mobile hover state persistence issue - specifically for Take Photo button
    const resetButtonStates = () => {
      // Check if on mobile device
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return;
      
      // Force reset any lingering hover states on mobile, especially Take Photo button
      const buttons = document.querySelectorAll('.btn--white-to-black');
      buttons.forEach(btn => {
        if (btn instanceof HTMLElement) {
          // Remove any existing inline styles that might persist
          btn.style.removeProperty('background');
          btn.style.removeProperty('color');
          btn.style.removeProperty('border-color');
          
          // Force reset to default state
          btn.style.background = '#fff !important';
          btn.style.color = '#000 !important';
          btn.style.borderColor = '#fff !important';
          
          // Remove any hover classes that might be stuck
          btn.classList.remove('hover');
          btn.blur(); // Remove focus state
        }
      });
    };
    
    // Reset button states immediately and multiple times for mobile reliability
    resetButtonStates();
    const resetTimer1 = setTimeout(resetButtonStates, 50);
    const resetTimer2 = setTimeout(resetButtonStates, 150);
    const resetTimer3 = setTimeout(resetButtonStates, 300);
    
    // Start camera after a short delay to ensure component is ready
    const cameraTimer = setTimeout(() => {
      startCamera();
    }, 100);
    
    return () => {
      clearTimeout(resetTimer1);
      clearTimeout(resetTimer2);
      clearTimeout(resetTimer3);
      clearTimeout(cameraTimer);
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
      
      // Apply horizontal flip transformation
      ctx.scale(-1, 1);
      ctx.translate(-w, 0);
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

      {/* Navigation header */}
      <header className="photobooth-nav-wrapper">
        <Button as="a" href="/">
          Back
        </Button>
        <div className="right-wrapper">
          {!photoTaken && (
            <Button onClick={takePhoto} disabled={!cameraReady} className="btn--white-to-black">
              Take photo
            </Button>
          )}
        </div>
      </header>

      {/* Upload/Cancel buttons (only when photo taken) */}
      {photoTaken && (
        <div className="photo-actions-buttons">
          <Button onClick={uploadPhoto} disabled={busy} className="btn--white-to-black">
            {uploadSuccess ? "Success!" : busy ? "Uploading..." : "Upload"}
          </Button>
          {!busy && !uploadSuccess && (
            <Button onClick={cancelPhoto} className="btn--black-to-white">
              Cancel
            </Button>
          )}
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

        /* DEPRECATED: Old button styles - replaced with .btn system */
        /*
        .back-button { ... }
        .back-button a { ... }
        .take-photo-button { ... }
        .take-photo-button button { ... }
        */

        .photo-actions-buttons {
          position: fixed;
          top: 32px;
          right: 32px;
          z-index: 1000;
          display: flex;
          gap: 12px;
        }

        /* DEPRECATED: Old upload/cancel button styles - now using .btn system */
        /*
        .upload-btn { ... }
        .cancel-btn { ... }
        */

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
          transform: scaleX(-1); /* Mirror the camera like a selfie cam */
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
          background: #fff;
          z-index: 10;
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



        .error-overlay {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          background: #000;
          color: #fff;
          border: 1px solid #fff;
          border-radius: 0;
          padding: 16px 32px;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          z-index: 100;
          min-width: 200px;
          text-align: center;
        }

        @media (max-width: 768px) {
          /* DEPRECATED: Old button responsive styles */
          /*
          .back-button { ... }
          .take-photo-button { ... }
          */
          
          .photo-actions-buttons {
            top: 20px;
            right: 20px;
            flex-direction: column;
            gap: 10px;
          }
          
          /* DEPRECATED: Old upload/cancel responsive styles */
          /*
          .upload-btn, .cancel-btn { ... }
          */
          
          .camera-loading span {
            font-size: 14px;
          }
          
          .error-overlay {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            bottom: auto;
            padding: 14px 28px;
            min-width: 180px;
            font-size: 13px;
          }
        }

        /* Tablet portrait mode - buttons at bottom */
        @media (min-width: 769px) and (max-width: 1024px) and (orientation: portrait) {
          .photobooth-nav-wrapper {
            top: auto !important;
            bottom: 32px !important;
            left: 32px !important;
            right: 32px !important;
          }
          
          .photo-actions-buttons {
            top: auto;
            bottom: 32px;
            right: 32px;
            flex-direction: row;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}

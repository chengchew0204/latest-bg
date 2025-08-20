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

  // Recording state for video backup
  const recRef = useRef<MediaRecorder | null>(null);
  const sessionIdRef = useRef<string>("");
  const chunkIndexRef = useRef<number>(0);
  const recordingSupportedRef = useRef<boolean>(false);
  const stoppingRef = useRef<boolean>(false);
  const selectedMimeRef = useRef<string>(""); // Store selected MIME type for consistency

  // Choose a supported mime type for MediaRecorder with comprehensive format support
  const pickMime = (): string | null => {
    // Detect user agent for platform-specific optimization
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    //console.log('Platform detection:', { isIOS, isSafari, isAndroid, isChrome, isFirefox });

    // 2025/08 CORRECT MediaRecorder support - all major browsers support both formats
    const cands = [
      // MP4 formats - supported by ALL major browsers (Chrome, Firefox, Safari, Edge)
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2", // H.264 baseline + AAC (universal support)
      "video/mp4;codecs=avc1.42E01E",         // H.264 baseline video only
      "video/mp4",                            // Basic MP4 (most compatible)
      
      // WebM formats - excellent support in Chrome/Firefox/Edge, Safari 17.4+ on iOS
      "video/webm;codecs=vp9,opus",           // VP9 + audio (high quality)
      "video/webm;codecs=vp9",                // VP9 video only
      "video/webm;codecs=vp8,opus",           // VP8 + audio (stable fallback)
      "video/webm;codecs=vp8",                // VP8 video only
      "video/webm",                           // Basic WebM fallback
    ];

    // Platform-specific optimization (all browsers support both MP4 and WebM)
    let optimizedCands = [...cands];
    
    if (isIOS || isSafari) {
      // Safari/iOS: Prefer MP4 H.264 (hardware acceleration), WebM since iOS 17.4
      optimizedCands = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",  // Best performance on Apple devices
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
        "video/webm;codecs=vp9,opus",              // Available since iOS 17.4
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp8",
        "video/webm"
      ];
    } else {
      // Chrome/Firefox/Edge: Prefer WebM (better compression), MP4 as universal fallback
      optimizedCands = [
        "video/webm;codecs=vp9,opus",              // Best quality/compression
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",  // Universal compatibility
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4"
      ];
    }

    // Test each codec and return the first supported one
    for (const m of optimizedCands) {
      if (typeof window !== "undefined" && window.MediaRecorder && window.MediaRecorder.isTypeSupported(m)) {
       // console.log(`✅ Selected MIME type: ${m}`);
       // console.log(`Platform: ${isIOS ? 'iOS' : isAndroid ? 'Android' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Other'}`);
        return m;
      }
    }
    
    //console.warn('❌ No supported MIME types found');
    return null;
  };

  // Start recording video backup
  const startRecording = useCallback((stream: MediaStream, forceNewSession = false) => {
    // Use consistent MIME type for the entire session unless forced to restart
    let mime = selectedMimeRef.current;
    if (!mime || forceNewSession) {
      const newMime = pickMime();
      if (newMime) {
        mime = newMime;
        selectedMimeRef.current = newMime;
      }
    }
    
    recordingSupportedRef.current = !!mime;
    if (!mime) return;

    // Only create new session if forced or if no session exists
    if (!sessionIdRef.current || forceNewSession) {
      sessionIdRef.current = crypto.randomUUID();
      chunkIndexRef.current = 0;
    }
    
    // Get actual video track resolution for bitrate calculation
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const width = settings.width || 1920;
    const height = settings.height || 1080;
    
    // Calculate bitrate based on resolution for high quality
    // 4K (3840x2160): ~15-20 Mbps
    // 1080p (1920x1080): ~5-8 Mbps
    // 720p (1280x720): ~2-3 Mbps
    let bitrate = 2_000_000; // Default 2 Mbps
    const pixels = width * height;
    
    if (pixels >= 3840 * 2160 * 0.8) { // 4K or near 4K
      bitrate = 18_000_000; // 18 Mbps for 4K
    } else if (pixels >= 1920 * 1080 * 0.8) { // 1080p or near 1080p
      bitrate = 6_000_000; // 6 Mbps for 1080p
    } else if (pixels >= 1280 * 720 * 0.8) { // 720p or near 720p
      bitrate = 3_000_000; // 3 Mbps for 720p
    }

    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    recRef.current = mr;
    chunkIndexRef.current = 0;
    stoppingRef.current = false;

    mr.ondataavailable = async (ev: BlobEvent) => {
      if (!ev.data || ev.data.size === 0) return;
      try {
        const form = new FormData();
        
        // Determine file extension based on MIME type
        const fileExt = mime.includes("mp4") ? "mp4" : "webm";
        form.append("file", ev.data, `part-${chunkIndexRef.current}.${fileExt}`);
        form.append("session", sessionIdRef.current);
        form.append("idx", String(chunkIndexRef.current));
        form.append("mimeType", mime); // Include MIME type for server processing
        
        chunkIndexRef.current += 1;
        // fire-and-forget upload; resilient due to chunking
        fetch("/api/upload-video-chunk", { method: "POST", body: form }).catch(() => {});
      } catch {
        // swallow errors to avoid breaking the user flow
      }
    };

    // Adjust timeslice based on resolution for optimal chunk size
    // 4K: 3 seconds (~6-8MB chunks)
    // 1080p: 4 seconds (~3-4MB chunks) 
    // 720p: 5 seconds (~2-3MB chunks)
    let timeslice = 4000; // Default 4 seconds
    if (pixels >= 3840 * 2160 * 0.8) {
      timeslice = 3000; // 3 seconds for 4K
    } else if (pixels <= 1280 * 720 * 1.2) {
      timeslice = 5000; // 5 seconds for 720p and below
    }
    
    mr.start(timeslice);
  }, []);

  // Gracefully stop the recorder and try to flush the final chunk
  const stopRecordingAndFlush = () => {
    if (!recRef.current) return;
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    const mr = recRef.current;
    if (mr.state === "inactive") return;

    return new Promise<void>((resolve) => {
      const finalize = () => {
        recRef.current = null;
        resolve();
      };
      mr.onstop = () => finalize();
      try {
        mr.stop();
      } catch {
        finalize();
      }
    });
  };

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null);
    setCameraActive(true);
    setCameraReady(false);
    
    try {
      // Request high quality video stream with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1920, max: 3840 },  // Request up to 4K resolution
          height: { ideal: 1080, max: 2160 }, // Request up to 4K resolution
          frameRate: { ideal: 30, max: 60 },  // High frame rate for better quality
          facingMode: 'user'                  // Front-facing camera
        }, 
        audio: false 
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      
      // Wait for video to be ready
      v.onloadedmetadata = () => {
        setCameraReady(true);
      };
      
      await v.play();
      
      // Start recording immediately after camera is ready with new session
      startRecording(stream, true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Camera permission denied");
      setCameraActive(false);
      setCameraReady(false);
    }
  }, [startRecording]); // Add startRecording dependency

  // Stop camera to release resources
  const stopCamera = useCallback(() => {
    // Stop recording first
    stopRecordingAndFlush();
    
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

  // Try to flush when the page is hiding
  useEffect(() => {
    const handler = () => { stopRecordingAndFlush(); };
    window.addEventListener("pagehide", handler);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handler();
    });
    return () => {
      window.removeEventListener("pagehide", handler);
    };
  }, []);

  // Capture a frame and freeze video
  const takePhoto = async () => {
    setError(null);
    try {
      const video = videoRef.current!;
      if (!video || !cameraReady || !video.videoWidth) {
        throw new Error("Camera is not ready");
      }

      // Pause the video to create freeze effect (but keep recording in background)
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
      
      // Set high quality rendering settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Apply horizontal flip transformation
      ctx.scale(-1, 1);
      ctx.translate(-w, 0);
      ctx.drawImage(video, 0, 0, w, h);

      // Get image data as base64 for upload with high quality
      const imageData = canvas.toDataURL("image/jpeg", 0.95);
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
      
      // Stop current recording session and flush final chunk
      await stopRecordingAndFlush();
      
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
    
    // Resume video playback (recording continues in background)
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

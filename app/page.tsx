"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

export default function Page() {
  const [bgVersion, setBgVersion] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const bgVersionRef = useRef<number>(0);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    
    // Check for stored version first, then use current time
    const storedVersion = localStorage.getItem('bg-version');
    const initialVersion = storedVersion ? parseInt(storedVersion, 10) : Date.now();
    bgVersionRef.current = initialVersion;
    setBgVersion(initialVersion);
  }, []);

  // Check for background updates periodically
  useEffect(() => {
    if (!isClient) return;

    const checkForUpdates = () => {
      // Check localStorage for latest version
      const storedVersion = localStorage.getItem('bg-version');
      
      // If no stored version, don't update - use the current version
      if (!storedVersion) {
        return;
      }
      
      const newVersion = parseInt(storedVersion, 10);
      
      // Only update if version actually changed
      if (newVersion !== bgVersionRef.current) {
        bgVersionRef.current = newVersion;
        setBgVersion(newVersion);
      }
    };

    // Update background when page becomes visible (user returns from photobooth)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };

    // Also update on focus (when user clicks back to tab)
    const handleFocus = () => {
      checkForUpdates();
    };

    // Remove periodic checking - only check when user returns to page
    // const interval = setInterval(() => {
    //   if (!document.hidden) {
    //     checkForUpdates();
    //   }
    // }, 5000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      // clearInterval(interval); // No longer needed
    };
  }, [isClient]);

  // Desktop auto-scroll functionality
  useEffect(() => {
    if (!isClient) return;

    // Only apply on desktop (screen width > 768px)
    const isDesktop = window.innerWidth > 768;
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {

      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const mouseY = e.clientY;
      const distanceFromBottom = viewportHeight - mouseY;

      // Update background zoom state and scroll simultaneously
      const nearBottom = distanceFromBottom <= 300;
      setIsNearBottom(nearBottom);

      // Scroll immediately with the background zoom (no delay)
      if (nearBottom) {
        // Scroll to bottom when cursor is within 300px of bottom
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Scroll to top when cursor is outside the 300px zone
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    };

    // Add event listener
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isClient]);

  return (
    <div>
      <div id="home">
        {/* Submit background image button */}
        <Button as="a" href="/Photobooth" className="btn--fixed-top-right btn--white-to-black">
          Submit background image
        </Button>

        {/* Main content */}
        <div className="main-content">
          {/* Left side - Main text */}
          <div className="main-text">
            <h1 style={{ marginBottom: "-50px" }}><span style={{ color: "red" }}>Zack Woo</span> is a Dallas-based artist/coder exploring systems, self-generating processes, and <a
                href="https://zenodo.org/records/15897903"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >
                digital Autopoiesis
              </a> through technology. </h1>
            <h3 className="subtitle-text" style={{ position: "relative", top: "55px", maxWidth: "55vw", fontWeight: "350", whiteSpace: "nowrap" }}>In addition to his independent work, he collaborates across art and music to create transformative web experiences. </h3>
          </div>
          
          {/* Right side - Two columns */}
          <div className="side-columns" style={{ marginBottom: "40px" }}>
            <div className="column">
              <h3>Selected clients</h3>
              <div className="client-list">
                <a href="https://www.camp.mx/" style={{ color: "#fff" }}>camp.mx</a><br />
                <a href="https://artscilab.utdallas.edu/" style={{ color: "#fff" }}>ArtSciLab@UTD</a><br />
                <a href="https://over-my-body-next-js-2s2c.vercel.app/" style={{ color: "#fff" }}>OVERMYBODY</a><br />
              </div>
            </div>
            
            <div className="column">
              <h3>Contact</h3>
              <div className="contact-list">
                <a href="https://www.instagram.com/cov1d.69/">Instagram</a><br />
                <a href="mailto:chengchew0204@gmail.com">Email</a>
              </div>
            </div>
          </div>
        </div>

        {/* Background wrapper */}
        <div className="backgroundWrapper">
          <div className="background-cover"></div>
          {bgVersion !== null && (
            <div 
              className="sc-gsTEea lkvHic"
              style={{
                position: "fixed",
                inset: 0,
                backgroundImage: `url(/bg?v=${bgVersion})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                zIndex: -1,
                transform: isNearBottom ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.6s ease-out",
              }}
            ></div>
          )}
        </div>
      </div>


    </div>
  );
}

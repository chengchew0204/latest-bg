"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

export default function Page() {
  const [bgVersion, setBgVersion] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);
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
            <h1>Zack is a Dallas-based artist and coder working with lens-based media. </h1>
            <p style={{ lineHeight: "25px", marginTop: "-30px" }}>His practice merges technology and moving image to capture scenes in ways that heighten reality. Alongside his independent work, he collaborates with clients across art and fashion. </p>
          </div>
          
          {/* Right side - Two columns */}
          <div className="side-columns" style={{ marginBottom: "65px" }}>
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
          <div 
            className="sc-gsTEea lkvHic"
            style={{
              position: "fixed",
              inset: 0,
              backgroundImage: `url(/bg?v=${bgVersion})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              zIndex: -1,
            }}
          ></div>
        </div>
      </div>

                <style jsx>{`
            /* DEPRECATED: Old button styles - replaced with .btn system */
            /*
            .submit-button { ... }
            .submit-button a { ... }
            */

        .main-content {
          position: relative;
          z-index: 1;
          padding: 60px;
          min-height: 100vh;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .main-text {
          flex: 1;
          max-width: 60%;
          padding-right: 60px;
        }

        .main-text h1 {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 40px 0;
        }

        .main-text p {
          color: #fff;
          margin: 0;
        }

        .side-columns {
          display: flex;
          gap: 60px;
          align-items: flex-start;
        }

        .column {
          min-width: 120px;
        }

        .column h3 {
          font-size: 14px;
          font-weight: 400;
          font-style: italic;
          color: #fff;
          margin: 0 0 20px 0;
          opacity: 0.8;
        }

        .client-list,
        .contact-list {
          font-size: 14px;
          line-height: 1.6;
          color: #fff;
          font-weight: 400;
        }

        .contact-list a {
          color: #fff;
          text-decoration: underline;
          transition: opacity 0.3s ease;
        }

        .contact-list a:hover {
          opacity: 0.7;
        }

        .backgroundWrapper {
          position: fixed;
          inset: 0;
          z-index: -2;
        }

        .background-cover {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 1;
        }

        #home {
          position: relative;
          min-height: 100vh;
        }

        @media (max-width: 1024px) {
          .main-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 60px;
            padding: 40px;
          }
          
          .main-text {
            max-width: 100%;
            padding-right: 0;
          }
          
          .main-text h1 {
            font-size: 36px;
          }
          
          .side-columns {
            gap: 40px;
          }
        }

      @media (max-width: 768px) {
              .main-content {
                padding: 30px 20px;
              }
              
              .main-text h1 {
                font-size: 28px;
              }
              
              .side-columns {
                flex-direction: column;
                gap: 30px;
              }
              
              /* DEPRECATED: Old submit-button styles */
              /*
              .submit-button { ... }
              .submit-button a { ... }
              */
            }
      `}</style>
    </div>
  );
}

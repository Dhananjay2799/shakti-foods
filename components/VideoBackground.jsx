"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function VideoBackground({
  src,
  mobileSrc,
  poster = "/nature/rice-fields.svg",
  mobilePoster,
  children,
  overlayClassName = "",
  className = ""
}) {
  const videoRef = useRef(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const updateSource = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      setActiveSrc(isMobile && mobileSrc ? mobileSrc : src);
      setVideoFailed(false);
    };

    updateSource();
    window.addEventListener("resize", updateSource);

    return () => window.removeEventListener("resize", updateSource);
  }, [src, mobileSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const playVideo = () => {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          setVideoFailed(true);
        });
      }
    };

    playVideo();

    const timer = setTimeout(() => {
      playVideo();
    }, 500);

    return () => clearTimeout(timer);
  }, [activeSrc]);

  const imagePoster = mobilePoster || poster || "/nature/rice-fields.svg";

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {videoFailed ? (
        <Image
          src={imagePoster}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <video
          key={activeSrc}
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={imagePoster}
          onError={() => setVideoFailed(true)}
          className="bg-video"
        >
          <source src={activeSrc} type="video/mp4" />
        </video>
      )}

      <div className={`absolute inset-0 ${overlayClassName}`} />
      {children}
    </div>
  );
}
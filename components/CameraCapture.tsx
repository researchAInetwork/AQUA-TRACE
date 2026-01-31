
import React, { useRef, useEffect, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onError: (error: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Zoom State refs
  const [zoomCap, setZoomCap] = useState<{ min: number; max: number } | null>(null);
  const [currentZoomDisplay, setCurrentZoomDisplay] = useState<number>(1);
  const zoomRef = useRef<number>(1);
  const baseZoomRef = useRef<number>(1);
  const baseDistRef = useRef<number>(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // Requesting zoom capability if possible in initial constraints often helps
            // but isn't strictly necessary as we check capabilities later
          },
          audio: false // Visual analysis only
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          setStream(currentStream);
          setIsInitialized(true);

          // Check for Zoom Capabilities
          const track = currentStream.getVideoTracks()[0];
          const capabilities = track.getCapabilities() as any; // Cast to allow accessing 'zoom'

          if (capabilities.zoom) {
            setZoomCap({ min: capabilities.zoom.min, max: capabilities.zoom.max });
            zoomRef.current = capabilities.zoom.min;
            setCurrentZoomDisplay(capabilities.zoom.min);
          }
        }
      } catch (err) {
        console.error("Camera access error:", err);
        onError("Camera access denied or unavailable. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [onError]);

  // Touch Handlers for Zoom
  const getPinchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      baseDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
      baseZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = async (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomCap && stream) {
      // Prevent browser zooming/scrolling behavior
      if (e.cancelable) e.preventDefault();

      const dist = getPinchDistance(e.touches[0], e.touches[1]);
      // Avoid division by zero
      if (baseDistRef.current === 0) return;

      const scale = dist / baseDistRef.current;
      
      // Calculate new zoom
      let targetZoom = baseZoomRef.current * scale;
      
      // Clamp to supported range
      targetZoom = Math.min(Math.max(targetZoom, zoomCap.min), zoomCap.max);

      // Apply zoom constraint
      try {
        const track = stream.getVideoTracks()[0];
        await track.applyConstraints({ advanced: [{ zoom: targetZoom }] } as any);
        zoomRef.current = targetZoom;
        setCurrentZoomDisplay(Number(targetZoom.toFixed(1)));
      } catch (err) {
        console.warn("Zoom application failed", err);
      }
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "scan_capture.jpg", { type: "image/jpeg" });
            onCapture(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); 
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], "scan_clip.webm", { type: 'video/webm' });
        onCapture(file);
        setRecordingTime(0);
      };

      recorder.start();
      setIsRecording(true);
      
      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= 10) {
          stopRecording(); // Auto-stop at 10s
        }
      }, 100);

    } catch (e) {
      console.error("Recording error:", e);
      onError("Failed to start video recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleTrigger = () => {
    if (mode === 'photo') {
      handleCapturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  return (
    <div 
      className="relative w-full h-64 lg:h-[400px] bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl group touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Video Feed */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover"
      />

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scan Line Animation (only in photo mode or non-recording video) */}
        {!isRecording && <div className="animate-scan"></div>}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-900/80 px-3 py-1 rounded-full border border-red-500/50 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-white font-mono text-xs font-bold">{recordingTime.toFixed(1)}s / 10.0s</span>
          </div>
        )}

        {/* Zoom Indicator */}
        {zoomCap && currentZoomDisplay > 1 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded text-xs text-white font-mono border border-white/20">
            {currentZoomDisplay.toFixed(1)}x
          </div>
        )}

        {/* Corner Markers */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-500"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-500"></div>
        {!isRecording && <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-500"></div>}
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-500"></div>

        {/* Central Reticle */}
        {!isRecording && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-cyan-500/30 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
          </div>
        )}

        {/* Mode Indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/70 px-3 py-1 rounded text-[10px] text-cyan-400 font-mono border border-cyan-900/50 backdrop-blur-sm">
           {mode === 'photo' ? 'OPTICAL SENSOR // STILL' : 'OPTICAL SENSOR // VIDEO STREAM'}
        </div>
      </div>

      {/* Controls Container */}
      {isInitialized && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4 z-20">
          
          {/* Mode Switcher */}
          {!isRecording && (
            <div className="flex bg-slate-800/80 rounded-full p-1 border border-slate-700 backdrop-blur-sm pointer-events-auto">
              <button
                onClick={() => setMode('photo')}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${mode === 'photo' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                PHOTO
              </button>
              <button
                onClick={() => setMode('video')}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${mode === 'video' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                VIDEO
              </button>
            </div>
          )}

          {/* Trigger Button */}
          <button 
            onClick={handleTrigger}
            className="group relative flex items-center justify-center transition-all hover:scale-105 active:scale-95 pointer-events-auto"
            title={mode === 'photo' ? "Capture Image" : (isRecording ? "Stop Recording" : "Record Video")}
          >
            {/* Outer Ring */}
            <div className={`w-16 h-16 rounded-full border-2 transition-all duration-300 ${isRecording ? 'border-red-500/50' : 'border-white/30 group-hover:border-white/80'}`}></div>
            
            {/* Inner Button */}
            <div className={`absolute transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.5)] 
              ${mode === 'photo' 
                ? 'w-12 h-12 bg-white/90 rounded-full' 
                : isRecording 
                  ? 'w-6 h-6 bg-red-500 rounded-sm' 
                  : 'w-12 h-12 bg-red-500/90 rounded-full'
              }
            `}></div>
          </button>
        </div>
      )}

      {/* Initializing State */}
      {!isInitialized && (
         <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-30">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-6 w-6 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs text-cyan-500 font-mono uppercase tracking-widest">Initializing Sensor...</span>
            </div>
         </div>
      )}
    </div>
  );
};

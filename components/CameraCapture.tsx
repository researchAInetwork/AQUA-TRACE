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
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
          setStream(currentStream);
          setIsInitialized(true);

          const track = currentStream.getVideoTracks()[0];
          const capabilities = track.getCapabilities() as any;

          if (capabilities.zoom) {
            setZoomCap({ min: capabilities.zoom.min, max: capabilities.zoom.max });
            zoomRef.current = capabilities.zoom.min;
            setCurrentZoomDisplay(capabilities.zoom.min);
          }
        }
      } catch (err) {
        onError("Camera denied.");
      }
    };

    startCamera();

    return () => {
      if (currentStream) currentStream.getTracks().forEach(track => track.stop());
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [onError]);

  const getPinchDistance = (t1: React.Touch, t2: React.Touch) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      baseDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
      baseZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = async (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomCap && stream) {
      if (e.cancelable) e.preventDefault();
      const dist = getPinchDistance(e.touches[0], e.touches[1]);
      if (baseDistRef.current === 0) return;
      const scale = dist / baseDistRef.current;
      let targetZoom = Math.min(Math.max(baseZoomRef.current * scale, zoomCap.min), zoomCap.max);
      try {
        const track = stream.getVideoTracks()[0];
        await track.applyConstraints({ advanced: [{ zoom: targetZoom }] } as any);
        zoomRef.current = targetZoom;
        setCurrentZoomDisplay(targetZoom);
      } catch (err) {}
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
          if (blob) onCapture(new File([blob], "scan.jpg", { type: "image/jpeg" }));
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' }); 
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => onCapture(new File([new Blob(chunksRef.current, { type: 'video/webm' })], "clip.webm", { type: 'video/webm' }));
      recorder.start();
      setIsRecording(true);
      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= 10) stopRecording();
      }, 100);
    } catch (e) {
      onError("Record error.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleTrigger = () => mode === 'photo' ? handleCapturePhoto() : (isRecording ? stopRecording() : startRecording());

  return (
    <div 
      className="relative w-full h-full bg-black rounded-xl overflow-hidden border border-slate-800 touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
           <div className="bg-black/60 px-2 py-0.5 rounded text-[9px] text-cyan-500 font-mono tracking-widest border border-cyan-900/40 uppercase">
             Optics: {mode}
           </div>
           {isRecording && (
             <div className="bg-red-500/80 px-2 py-0.5 rounded text-[9px] text-white font-mono font-bold animate-pulse">
               REC {recordingTime.toFixed(1)}s
             </div>
           )}
        </div>

        {/* Center Guide */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-10 h-10 border border-white rounded-full"></div>
        </div>

        {/* Controls Overlay */}
        <div className="flex flex-col items-center gap-3 pointer-events-auto">
          {!isRecording && (
            <div className="flex bg-slate-900/80 rounded-full p-0.5 border border-slate-700 backdrop-blur-md">
              <button onClick={() => setMode('photo')} className={`px-3 py-1 rounded-full text-[8px] font-black transition-all ${mode === 'photo' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>STILL</button>
              <button onClick={() => setMode('video')} className={`px-3 py-1 rounded-full text-[8px] font-black transition-all ${mode === 'video' ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>VIDEO</button>
            </div>
          )}

          <button onClick={handleTrigger} className="relative group flex items-center justify-center">
            <div className={`w-12 h-12 rounded-full border-2 transition-all ${isRecording ? 'border-red-500' : 'border-white/40'}`}></div>
            <div className={`absolute transition-all ${mode === 'photo' ? 'w-9 h-9 bg-white rounded-full' : isRecording ? 'w-4 h-4 bg-red-500 rounded-sm' : 'w-9 h-9 bg-red-500 rounded-full'}`}></div>
          </button>
        </div>
      </div>

      {!isInitialized && (
         <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="animate-spin h-4 w-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"></div>
         </div>
      )}
    </div>
  );
};
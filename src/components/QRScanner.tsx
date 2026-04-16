import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, SwitchCamera, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QRScannerProps {
  onScan: (data: string) => void;
  scanning: boolean;
  /** When true, show external camera picker (device selection). Useful for admin scanning with external scanners/cameras. */
  allowDeviceSelection?: boolean;
}

export function QRScanner({ onScan, scanning, allowDeviceSelection = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const lastScanRef = useRef('');
  const lastScanTimeRef = useRef(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setActive(false);
  }, []);

  const enumerateCameras = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === 'videoinput');
      setDevices(cams);
    } catch (err) {
      console.error('enumerateDevices error', err);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      // After permission granted, labels populate
      if (allowDeviceSelection) await enumerateCameras();
    } catch (err: any) {
      setError('Camera access denied or device unavailable.');
      console.error('Camera error:', err);
    }
  }, [facingMode, selectedDeviceId, allowDeviceSelection, enumerateCameras]);

  const toggleFacing = useCallback(() => {
    stopCamera();
    setSelectedDeviceId('');
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, [stopCamera]);

  // Restart camera when facing mode or device changes
  useEffect(() => {
    if (scanning) {
      startCamera();
    }
    return () => stopCamera();
  }, [scanning, facingMode, selectedDeviceId]);

  // QR code scanning loop using BarcodeDetector API
  useEffect(() => {
    if (!active || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector: any = null;
    if (hasBarcodeDetector) {
      detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    }

    const scan = async () => {
      if (!video.videoWidth || !video.videoHeight) {
        animFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const now = Date.now();
            const value = barcodes[0].rawValue;
            if (value !== lastScanRef.current || now - lastScanTimeRef.current > 3000) {
              lastScanRef.current = value;
              lastScanTimeRef.current = now;
              onScan(value);
            }
          }
        } catch (err) {
          // ignore detection errors
        }
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
        }
      }

      animFrameRef.current = requestAnimationFrame(scan);
    };

    animFrameRef.current = requestAnimationFrame(scan);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active, scanning, onScan]);

  if (!scanning) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[300px] aspect-square rounded-xl overflow-hidden border-2 border-primary/30 bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {active && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-md" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-md" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-md" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-md" />
            <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-primary/60 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
            <div className="text-center">
              <CameraOff className="mx-auto size-8 text-destructive mb-2" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={toggleFacing}>
          <SwitchCamera className="size-3.5" /> Flip Camera
        </Button>
        {allowDeviceSelection && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={enumerateCameras}>
            <RefreshCw className="size-3.5" /> Refresh Devices
          </Button>
        )}
      </div>

      {allowDeviceSelection && devices.length > 0 && (
        <div className="w-full max-w-[300px]">
          <Select value={selectedDeviceId || '__default__'} onValueChange={(v) => setSelectedDeviceId(v === '__default__' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose camera / external scanner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__" className="text-xs">Built-in (auto)</SelectItem>
              {devices.map(d => (
                <SelectItem key={d.deviceId} value={d.deviceId} className="text-xs">
                  {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-2xs text-muted-foreground mt-1.5 text-center">
            Connect an external USB/IP camera or barcode scanner, then click Refresh Devices.
          </p>
        </div>
      )}

      {!('BarcodeDetector' in window) && (
        <p className="text-2xs text-muted-foreground text-center max-w-xs">
          Your browser doesn't support automatic QR scanning. Please use Chrome on Android or Safari 16.4+ on iOS for best results.
        </p>
      )}
    </div>
  );
}

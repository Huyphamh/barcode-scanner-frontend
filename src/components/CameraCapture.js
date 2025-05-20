import React, { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";
import Upscaler from "upscaler";
import { model } from "@upscalerjs/esrgan-medium";

const CameraCapture = ({ barcodes, setBarcodes }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const codeReader = useRef(new BrowserMultiFormatReader()).current;
  const clearCanvasTimeout = useRef(null);
  const lastScannedCodes = useRef(new Set());
  const upscalerRef = useRef(null);

  useEffect(() => {
    upscalerRef.current = new Upscaler({ model });
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    lastScannedCodes.current = new Set([...barcodes]);
  }, [barcodes]);

  const startScanner = async () => {
    if (scanning) return;
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: selectedCamera },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "");
        videoRef.current.play();
      }

      scanFrameLoop();
    } catch (error) {
      console.error("🚨 Lỗi khi mở camera:", error);
      setScanning(false);
    }
  };

  const scanFrameLoop = async () => {
    if (!videoRef.current || !scanning) return;

    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) {
      requestAnimationFrame(scanFrameLoop);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);

    try {
      const upscaled = await upscalerRef.current.upscale(imageData);

      const upCanvas = document.createElement("canvas");
      upCanvas.width = upscaled.width;
      upCanvas.height = upscaled.height;
      const upCtx = upCanvas.getContext("2d");
      upCtx.putImageData(upscaled, 0, 0);

      const upscaledImageData = upCtx.getImageData(
        0,
        0,
        upscaled.width,
        upscaled.height
      );
      const luminanceSource = new RGBLuminanceSource(
        upscaledImageData.data,
        upscaled.width,
        upscaled.height
      );
      const binaryBitmap = new BinaryBitmap(
        new HybridBinarizer(luminanceSource)
      );

      const result = codeReader.decode(binaryBitmap);
      if (result) {
        const code = result.getText();
        if (!lastScannedCodes.current.has(code)) {
          lastScannedCodes.current.add(code);
          toast.success(`✅ Đã quét: ${code}`, { autoClose: 2000 });
          setBarcodes((prev) => new Set([...prev, code]));
          if (navigator.vibrate) navigator.vibrate(200);
        }
      }
    } catch (err) {
      // Không log lỗi decode để tránh spam
    }

    requestAnimationFrame(scanFrameLoop);
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    codeReader.reset();
    setScanning(false);
    lastScannedCodes.current.clear();
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="text-center">
        <Typography variant="h5">📸 Quét mã vạch bằng camera</Typography>

        <div
          style={{
            width: "100%",
            height: "300px",
            border: "2px solid #007bff",
            borderRadius: "8px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <video ref={videoRef} style={{ width: "100%", height: "100%" }} />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              transition: "opacity 0.3s ease-in-out",
              opacity: 0,
            }}
          />
        </div>

        <Select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          style={{ marginTop: "10px" }}
        >
          <MenuItem value="environment">📷 Camera Sau</MenuItem>
        </Select>

        {scanning ? (
          <Typography variant="body1" color="primary" className="mt-2">
            🔍 Đang quét mã vạch...
          </Typography>
        ) : (
          <Typography variant="body1" color="textSecondary" className="mt-2">
            ⏹️ Máy quét đang dừng
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={startScanner}
          className="mt-3"
        >
          ▶️ Bắt đầu quét
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={stopScanner}
          className="mt-3 ml-2"
        >
          ⏹️ Dừng quét
        </Button>
      </CardContent>
    </Card>
  );
};

export default CameraCapture;

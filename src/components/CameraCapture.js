import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { BrowserMultiFormatReader } from "@zxing/library";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";

const MODEL_URL =
  "https://tfhub.dev/captain-pool/esrgan-tf2/1/default/1"; // ESRGAN TF Hub model

const CameraCapture = ({ barcodes, setBarcodes }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const codeReader = useRef(new BrowserMultiFormatReader()).current;
  const clearCanvasTimeout = useRef(null);
  const lastScannedCodes = useRef(new Set());
  const modelRef = useRef(null);

  useEffect(() => {
    lastScannedCodes.current = new Set([...barcodes]);
  }, [barcodes]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        modelRef.current = await tf.loadGraphModel(MODEL_URL, { fromTFHub: true });
        console.log("✅ ESRGAN model loaded");
      } catch (err) {
        console.error("❌ Load ESRGAN model failed:", err);
      }
    };
    loadModel();

    return () => {
      stopScanner();
    };
  }, []);

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
        await videoRef.current.play();
      }

      processFrame();
    } catch (error) {
      console.error("🚨 Lỗi khi mở camera:", error);
      setScanning(false);
    }
  };

  const processFrame = async () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const model = modelRef.current;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (!model) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(processFrame);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      let imgTensor = tf.browser.fromPixels(canvas);
      imgTensor = imgTensor.expandDims(0).toFloat().div(tf.scalar(255));

      let outputTensor = await model.executeAsync(imgTensor);
      if (Array.isArray(outputTensor)) outputTensor = outputTensor[0];

      const srTensor = outputTensor.squeeze().mul(tf.scalar(255)).clipByValue(0, 255).toInt();

      await tf.browser.toPixels(srTensor, canvas);

      imgTensor.dispose();
      outputTensor.dispose();
      srTensor.dispose();
    } catch (err) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      console.warn("⚠️ Lỗi khi chạy ESRGAN:", err);
    }

    try {
      const result = await codeReader.decodeFromCanvas(canvas);
      if (result) {
        const code = result.getText();
        if (!lastScannedCodes.current.has(code)) {
          lastScannedCodes.current.add(code);
          setBarcodes((prev) => new Set([...prev, code]));

          toast.success(`✅ Đã quét: ${code}`, {
            position: "top-right",
            autoClose: 2000,
          });

          if (navigator.vibrate) navigator.vibrate(200);
        }
      }
    } catch {
      // Không tìm thấy mã vạch
    }

    requestAnimationFrame(processFrame);
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    codeReader.reset();
    setScanning(false);
    lastScannedCodes.current.clear();

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasRef.current.style.opacity = "0";
    }
    if (clearCanvasTimeout.current) clearTimeout(clearCanvasTimeout.current);
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="text-center">
        <Typography variant="h5">📸 Quét mã vạch bằng camera + AI ESRGAN</Typography>

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
          <video
            ref={videoRef}
            style={{ display: "none" }}
            playsInline
            muted
            width="100%"
            height="100%"
          />
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
              opacity: 1,
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
            🔍 Đang quét với AI nâng cấp ảnh...
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

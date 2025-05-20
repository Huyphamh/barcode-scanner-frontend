import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { toast } from "react-toastify";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
} from "@mui/material";

const MODEL_URL = "/models/yolov5n/model.json"; // đường dẫn tới mô hình YOLO

const CameraCapture = ({ barcodes, setBarcodes }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader()).current;
  const [scanning, setScanning] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const lastScannedCodes = useRef(new Set());
  const animationFrameRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    lastScannedCodes.current = new Set([...barcodes]);
  }, [barcodes]);

  const loadModel = async () => {
    if (!modelRef.current) {
      modelRef.current = await tf.loadGraphModel(MODEL_URL);
      console.log("✅ YOLOv5n model loaded.");
    }
  };

  const startScanner = async () => {
    if (scanning) return;
    setScanning(true);
    await loadModel();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: selectedCamera },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", "");
      await videoRef.current.play();
      detectFrame();
    }
  };

  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !modelRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const tensor = tf.browser.fromPixels(video).expandDims(0).div(255);
    const preds = await modelRef.current.executeAsync(tensor);
    tf.dispose(tensor);

    // giả định output có bbox như [x, y, w, h, conf, class]
    const boxes = preds[0].arraySync()[0]; // Lấy danh sách bbox
    const scores = preds[1].arraySync()[0]; // Confidence (nếu có)

    for (let i = 0; i < boxes.length; i++) {
      const [x, y, w, h] = boxes[i];

      // lọc confidence
      if (scores[i] < 0.5) continue;

      // vẽ khung focus
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // cắt ảnh từ vùng bbox
      const cropped = await cropVideoFrame(video, x, y, w, h);

      try {
        const result = await codeReader.decodeFromImageElement(cropped);
        const code = result.getText();

        if (!lastScannedCodes.current.has(code)) {
          lastScannedCodes.current.add(code);
          setBarcodes((prev) => new Set([...prev, code]));

          toast.success(`✅ Quét thành công: ${code}`, {
            position: "top-right",
            autoClose: 2000,
          });

          if (navigator.vibrate) navigator.vibrate(200);
        }
      } catch (e) {
        // Không tìm thấy mã, bỏ qua
      }
    }

    preds.forEach((p) => tf.dispose(p));

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const cropVideoFrame = (video, x, y, w, h) => {
    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");

    tempCanvas.width = w;
    tempCanvas.height = h;

    ctx.drawImage(video, x, y, w, h, 0, 0, w, h);

    const img = new Image();
    img.src = tempCanvas.toDataURL("image/png");

    return new Promise((resolve) => {
      img.onload = () => resolve(img);
    });
  };

  const stopScanner = () => {
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }

    setScanning(false);
    lastScannedCodes.current.clear();

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <Card>
      <CardContent className="text-center">
        <Typography variant="h5">📸 Quét mã vạch bằng camera</Typography>

        <div style={{ width: "100%", height: "300px", position: "relative" }}>
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
            }}
          />
        </div>

        {/* <Select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          style={{ marginTop: "10px" }}
        >
          <MenuItem value="environment">📷 Camera Sau</MenuItem>
        </Select> */}

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

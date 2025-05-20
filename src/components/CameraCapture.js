import React, { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import { BrowserMultiFormatReader } from "@zxing/library";

const MODEL_PATH = "/models/yolov5n/model.json";

const CONFIDENCE_THRESHOLD = 0.5; // ngưỡng tin cậy YOLOv5 phát hiện

const CameraCapture = ({ barcodes, setBarcodes }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader()).current;
  const [scanning, setScanning] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const lastScannedCodes = useRef(new Set());
  const animationFrameId = useRef(null);

  // Load model YOLOv5n TF.js 1 lần
  useEffect(() => {
    (async () => {
      modelRef.current = await tf.loadGraphModel(MODEL_PATH);
      console.log("YOLOv5n TF.js model loaded");
    })();

    return () => stopScanner();
  }, []);

  // Đồng bộ set of barcodes đã quét
  useEffect(() => {
    lastScannedCodes.current = new Set([...barcodes]);
  }, [barcodes]);

  // Hàm bắt đầu camera và detect liên tục
  const startScanner = async () => {
    if (scanning) return;
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: selectedCamera },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        await videoRef.current.play();

        detectFrame();
      }
    } catch (error) {
      console.error("Lỗi truy cập camera:", error);
      setScanning(false);
    }
  };

  // Hàm dừng camera và detect
  const stopScanner = () => {
    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);
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

  // Hàm detect từng frame video
  const detectFrame = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !modelRef.current ||
      videoRef.current.readyState !== 4
    ) {
      animationFrameId.current = requestAnimationFrame(detectFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Chuẩn bị input cho YOLOv5n: resize video frame về 640x640, normalize [0,1]
    const inputSize = 640;
    const tfImg = tf.browser.fromPixels(video);
    const resized = tf.image.resizeBilinear(tfImg, [inputSize, inputSize]);
    const normalized = resized.div(255.0);
    const expanded = normalized.expandDims(0); // batch size 1

    tfImg.dispose();
    resized.dispose();

    // Chạy model để nhận diện
    let output = null;
    try {
      output = await modelRef.current.executeAsync(expanded);
    } catch (e) {
      console.error("Lỗi chạy model YOLOv5:", e);
      expanded.dispose();
      animationFrameId.current = requestAnimationFrame(detectFrame);
      return;
    }
    expanded.dispose();

    // output thường là tensor [1, n, 6] với [x_center, y_center, width, height, confidence, class]
    // convert sang mảng js
    const data = output.arraySync()[0];
    tf.dispose(output);

    // Lặp qua output để lấy bbox có confidence cao hơn ngưỡng
    for (let i = 0; i < data.length; i++) {
      const [xC, yC, w, h, conf, classId] = data[i];
      if (conf < CONFIDENCE_THRESHOLD) continue;

      // Chuyển tọa độ bbox từ 640x640 sang video kích thước thực
      const scaleX = video.videoWidth / inputSize;
      const scaleY = video.videoHeight / inputSize;

      const x = (xC - w / 2) * scaleX;
      const y = (yC - h / 2) * scaleY;
      const width = w * scaleX;
      const height = h * scaleY;

      // Vẽ bbox xanh lá
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Cắt vùng video bbox để decode mã vạch
      try {
        const croppedImg = await cropVideoArea(video, x, y, width, height);
        const result = await codeReader.decodeFromImageElement(croppedImg);
        const code = result.getText();

        // Nếu mã chưa quét, thêm vào list và báo thành công
        if (!lastScannedCodes.current.has(code)) {
          lastScannedCodes.current.add(code);
          setBarcodes((prev) => new Set([...prev, code]));
          console.log("Đã quét:", code);
          // Có thể thêm toast hoặc âm thanh thông báo ở đây
        }
      } catch (e) {
        // Nếu ZXing không decode được, bỏ qua
      }
    }

    animationFrameId.current = requestAnimationFrame(detectFrame);
  };

  // Hàm cắt vùng ảnh video theo bbox để tạo Image element cho ZXing decode
  const cropVideoArea = (video, x, y, width, height) => {
    return new Promise((resolve) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext("2d");
      ctx.drawImage(video, x, y, width, height, 0, 0, width, height);

      const img = new Image();
      img.onload = () => resolve(img);
      img.src = tempCanvas.toDataURL("image/png");
    });
  };

  return (
    <div>
      <video
        ref={videoRef}
        style={{ width: "100%", maxHeight: 400 }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          maxHeight: 400,
          pointerEvents: "none",
        }}
      />
      <div style={{ marginTop: 10 }}>
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          disabled={scanning}
        >
          <option value="environment">Camera Sau</option>
          <option value="user">Camera Trước</option>
        </select>
        <button onClick={startScanner} disabled={scanning}>
          Bắt đầu quét
        </button>
        <button onClick={stopScanner} disabled={!scanning}>
          Dừng quét
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;

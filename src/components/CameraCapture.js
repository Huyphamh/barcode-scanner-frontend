import React, { useEffect, useRef, useState } from "react";
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

const CameraCapture = ({ setBarcodes }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const codeReader = new BrowserMultiFormatReader();
  let clearCanvasTimeout = null;

  useEffect(() => {
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
        videoRef.current.setAttribute("playsinline", ""); // iOS cần
        videoRef.current.play();
      }

      codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            const points = result.getResultPoints();

            // Vẽ khung focus nếu có tọa độ
            if (canvasRef.current && points.length >= 2) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d");
              const rect = videoRef.current.getBoundingClientRect();

              canvas.width = rect.width;
              canvas.height = rect.height;

              const scaleX = canvas.width / videoRef.current.videoWidth;
              const scaleY = canvas.height / videoRef.current.videoHeight;

              const [p1, p2] = points;

              const x = p1.getX() * scaleX;
              const y = p1.getY() * scaleY;
              const width = (p2.getX() - p1.getX()) * scaleX || 80;
              const height = (p2.getY() - p1.getY()) * scaleY || 80;

              // Xóa canvas và vẽ mới
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.strokeStyle = "lime";
              ctx.lineWidth = 4;
              ctx.strokeRect(x, y, width, height);

              // Hiện canvas (fade in)
              canvas.style.opacity = "1";

              // Xóa sau 500ms (fade out)
              if (clearCanvasTimeout) clearTimeout(clearCanvasTimeout);
              clearCanvasTimeout = setTimeout(() => {
                canvas.style.opacity = "0";
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }, 500);
            }

            setBarcodes((prev) => {
              if (!prev.has(code)) {
                toast.success(`✅ Đã quét: ${code}`, {
                  position: "top-right",
                  autoClose: 2000,
                });
                return new Set([...prev, code]);
              }
              return prev;
            });

            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
          }
        }
      );
    } catch (error) {
      console.error("🚨 Lỗi khi mở camera:", error);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    codeReader.reset();
    setScanning(false);

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasRef.current.style.opacity = "0";
    }
    if (clearCanvasTimeout) clearTimeout(clearCanvasTimeout);
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="text-center">
        <Typography variant="h5">📸 Quét mã vạch bằng camera</Typography>

        {/* Vùng hiển thị camera + canvas */}
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

        {/* Chọn Camera */}
        <Select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          style={{ marginTop: "10px" }}
        >
          <MenuItem value="environment">📷 Camera Sau</MenuItem>
          {/* <MenuItem value="user">🤳 Camera Trước</MenuItem> */}
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

        {/* Nút điều khiển */}
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

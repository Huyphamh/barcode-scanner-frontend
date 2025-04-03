import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
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
  const [scanning, setScanning] = useState(false);
  //const [detectedBarcodes, setDetectedBarcodes] = useState(new Set()); // Dùng Set để tránh trùng
  const [selectedCamera, setSelectedCamera] = useState("environment");
  const codeReader = new BrowserMultiFormatReader();

  useEffect(() => {
    return () => {
      if (scanning) {
        stopScanner();
      }
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

            // ⚠️ Chỉ thêm nếu chưa có trong danh sách
            setBarcodes((prev) => {
              if (!prev.includes(code)) {
                return [...prev, code]; // Thêm mã mới
              }
              return prev; // Không thay đổi nếu trùng
            });

            // 📌 Hiệu ứng rung nếu quét thành công
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
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="text-center">
        <Typography variant="h5">📸 Quét mã vạch bằng camera</Typography>

        {/* Khu vực hiển thị camera */}
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

        {/* Hiển thị kết quả quét */}
        {/* {detectedBarcodes.size > 0 && (
          <Typography variant="body2" color="success" className="mt-3">
            ✅ Mã vạch đã quét: {[...detectedBarcodes].join(", ")}
          </Typography>
        )} */}
      </CardContent>
    </Card>
  );
};

export default CameraCapture;

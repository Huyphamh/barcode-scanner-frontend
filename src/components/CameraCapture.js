import React, { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import { Button, Card, CardContent, Typography } from "@mui/material";

const CameraCapture = ({ setBarcodes }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [detectedBarcodes, setDetectedBarcodes] = useState([]);

  useEffect(() => {
    return () => {
      if (scanning) {
        Quagga.stop();
      }
    };
  }, [scanning]);

  const startScanner = () => {
    if (scanning) return; // Nếu đang chạy thì không cần chạy lại

    if (!scannerRef.current) {
      console.error("⚠️ scannerRef chưa được gán vào DOM!");
      return;
    }

    setScanning(true);
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          constraints: { facingMode: "environment" }, // Dùng camera sau
          target: scannerRef.current, // Kiểm tra scannerRef trước khi truyền vào
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        decoder: {
          readers: ["ean_reader", "code_128_reader", "upc_reader"], // Các loại mã vạch cần quét
          multiple: true, // Cho phép quét nhiều mã cùng lúc
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("🚨 Lỗi QuaggaJS:", err);
          setScanning(false);
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected((result) => {
      if (!result || !result.codeResult || !result.codeResult.code) return;

      const codes = result.codeResult.code;
      if (!detectedBarcodes.includes(codes)) {
        setDetectedBarcodes((prev) => [...prev, codes]); // Lưu danh sách mã vạch
        setBarcodes((prev) => [...prev, codes]);

        // 📌 Hiệu ứng rung khi nhận diện mã vạch thành công
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      }
    });
  };

  const stopScanner = () => {
    if (Quagga) {
      Quagga.stop();
      setScanning(false);
    } else {
      console.warn("⚠️ Quagga chưa được khởi tạo!");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="text-center">
        <Typography variant="h5">📸 Quét mã vạch tự động</Typography>

        {/* Khu vực hiển thị camera */}
        <div
          ref={scannerRef}
          style={{
            width: "100%",
            height: "300px",
            border: "2px solid #007bff",
            borderRadius: "8px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {!scanning && (
            <Typography
              variant="body1"
              color="textSecondary"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              📷 Bật camera để quét mã vạch
            </Typography>
          )}
        </div>

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

        {detectedBarcodes.length > 0 && (
          <Typography variant="body2" color="success" className="mt-3">
            ✅ Mã vạch đã quét: {detectedBarcodes.join(", ")}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default CameraCapture;

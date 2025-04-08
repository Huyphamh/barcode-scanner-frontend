import React, { useState } from "react";
import axios from "axios";
import { Button, Card, CardContent, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const BarcodeScanner = ({ setBarcodes }) => {
  const [image, setImage] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        "https://barcode-scanner-backend-production.up.railway.app/upload",
        formData
      );

      console.log("📌 Dữ liệu server trả về:", response.data); // Debug API response

      if (response.data.success) {
        setBarcodes((prev) => [...prev, ...response.data.barcodes]);
      } else {
        alert("⚠️ Không tìm thấy mã vạch! Hãy chụp ảnh rõ hơn");
      }
    } catch (error) {
      console.error("❌ Lỗi khi quét mã vạch:", error);
      //alert("❌ Lỗi khi quét mã vạch! Ảnh có thể mờ hoặc quá xa");
      alert(
        "❌ Lỗi khi quét mã vạch! Ảnh có thể mờ hoặc quá xa. Vui lòng nâng cấp điện thoại đi Ní !!!"
      );
    }
  };

  return (
    <Card sx={{ boxShadow: 3, p: 2, textAlign: "center" }}>
      <CardContent>
        <Typography variant="h5">📁 Chọn hình ảnh để quét</Typography>
        <input
          type="file"
          accept="image/*"
          hidden
          id="upload-file"
          onChange={handleImageUpload}
        />
        <label htmlFor="upload-file">
          <Button
            variant="contained"
            component="span"
            startIcon={<CloudUploadIcon />}
            sx={{ mt: 2 }}
          >
            Tải ảnh lên
          </Button>
        </label>
        {image && (
          <img
            src={image}
            alt="Uploaded"
            style={{ width: "100%", marginTop: "15px", borderRadius: "8px" }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;

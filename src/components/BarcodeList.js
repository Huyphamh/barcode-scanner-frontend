import React, { useState } from "react";
import axios from "axios";
import {
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveAltIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const BarcodeList = ({ barcodes, setBarcodes }) => {
  const [sheetUrl, setSheetUrl] = useState("");

  const exportToExcel = async () => {
    const response = await axios.post(
      "https://barcode-scanner-backend-production.up.railway.app/export-excel",
      { data: [...barcodes] } // Convert Set to array
    );
    alert(`✅ File Excel đã xuất: ${response.data.file}`);
  };

  const uploadToGoogleSheets = async () => {
    if (!sheetUrl) {
      alert("⚠️ Vui lòng nhập link Google Sheets trước!");
      return;
    }

    if (barcodes.size === 0) {
      alert("⚠️ Danh sách mã vạch rỗng!");
      return;
    }

    try {
      const response = await axios.post(
        "https://barcode-scanner-backend-production.up.railway.app/upload-google-sheet",
        { barcodes: [...barcodes], sheetUrl },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.success) {
        alert("✅ Đã lưu vào Google Sheets!");
      } else {
        alert("⚠️ Lỗi khi lưu Google Sheets!");
      }
    } catch (error) {
      console.error("❌ Lỗi gửi API:", error.response?.data || error.message);
      alert("❌ Không thể gửi dữ liệu!");
    }
  };

  // const removeBarcode = (barcodeToRemove) => {
  //   setBarcodes(
  //     (prev) => new Set([...prev].filter((b) => b !== barcodeToRemove))
  //   );
  // };
  const removeBarcode = (index) => {
    setBarcodes((prev) => [...new Set(prev.filter((_, i) => i !== index))]);
  };

  const clearList = () => {
    if (window.confirm("❌ Bạn có chắc chắn muốn xóa danh sách?")) {
      setBarcodes(new Set());
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent>
        <Typography variant="h5" className="mb-3">
          📋 Danh sách mã vạch ({barcodes.size})
        </Typography>

        {/* Nhập link Google Sheets */}
        <TextField
          label="🔗 Link Google Sheets"
          variant="outlined"
          fullWidth
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="Dán link Google Sheets tại đây..."
          className="mb-3"
        />

        <List>
          {[...barcodes].length > 0 ? (
            [...barcodes].map((barcode, index) => (
              <React.Fragment key={index}>
                <ListItem
                  secondaryAction={
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => removeBarcode(barcode)}
                    >
                      <CloseIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <span>
                        <strong>#{index + 1}</strong> -{" "}
                        <span style={{ fontWeight: "bold", color: "blue" }}>
                          {barcode}
                        </span>
                      </span>
                    }
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          ) : (
            <Typography variant="body1" color="textSecondary">
              Chưa có dữ liệu...
            </Typography>
          )}
        </List>

        <Button
          variant="contained"
          startIcon={<SaveAltIcon />}
          onClick={exportToExcel}
          className="m-5 mt-3"
        >
          📂 Xuất Excel
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={uploadToGoogleSheets}
          className="m-5 mt-3 ml-2"
        >
          📤 Nhập Google Sheets
        </Button>
        <Button
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={clearList}
          className="m-5 mt-3 ml-2"
          color="error"
        >
          🗑️ Xóa danh sách
        </Button>
      </CardContent>
    </Card>
  );
};

export default BarcodeList;

import React, { useState } from "react";
import BarcodeScanner from "./components/BarcodeScanner";
import BarcodeList from "./components/BarcodeList";
import CameraCapture from "./components/CameraCapture";
import { Container, Typography, Box } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [barcodes, setBarcodes] = useState([]);

  return (
    <Container className="p-5 text-center">
      <Typography variant="h3" color="primary" className="mb-5">
        📷 Quét Mã Vạch
      </Typography>
      <Box className="space-y-5">
        <BarcodeScanner setBarcodes={setBarcodes} />
        <CameraCapture setBarcodes={setBarcodes} />
        <BarcodeList barcodes={barcodes} setBarcodes={setBarcodes} />
        <ToastContainer />
      </Box>
    </Container>
  );
}

export default App;

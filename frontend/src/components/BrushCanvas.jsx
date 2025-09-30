import { useRef, useState, useEffect } from "react";
import "./BrushCanvas.css";

export default function BrushCanvas({ imageSrc, onMaskReady }) {
  const canvasRef = useRef();
  const imageRef = useRef();
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas && image) {
      // Wait for image to load to get correct dimensions
      const handleLoad = () => {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.style.width = `${image.width}px`;
        canvas.style.height = `${image.height}px`;
      };

      if (image.complete) {
        handleLoad();
      } else {
        image.addEventListener("load", handleLoad);
        return () => image.removeEventListener("load", handleLoad);
      }
    }
  }, [imageSrc]);

  const getScaledCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getScaledCoords(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getScaledCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const submitMask = () => {
    canvasRef.current.toBlob((blob) => {
      onMaskReady(blob);
    });
  };

  return (
    <div className="brush-wrapper">
      <div className="canvas-container">
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Preview"
          className="canvas-image"
        />
        <canvas
          ref={canvasRef}
          className="brush-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      <div className="brush-controls">
        <label>
          Brush Size: {brushSize}
          <input
            type="range"
            min="5"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
          />
        </label>
        <button className="btn" onClick={clearCanvas}>Clear Mask</button>
        <button className="btn" onClick={submitMask}>Submit Mask</button>
      </div>
    </div>
  );
}

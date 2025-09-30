import { useRef, useState, useEffect } from "react";

export default function BrushEditor({ imageFile }) {
  const imageCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const [brushSize, setBrushSize] = useState(25);
  const [tool, setTool] = useState("brush"); // "brush" or "eraser"
  const [drawing, setDrawing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);

  useEffect(() => {
    if (!imageFile) return;
    const canvas = imageCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const maskCtx = maskCanvasRef.current.getContext("2d");
      maskCtx.clearRect(0, 0, canvas.width, canvas.height);
      setImageLoaded(true);
      setResultUrl(null);
    };
    img.src = URL.createObjectURL(imageFile);
  }, [imageFile]);

  const draw = (e, isTouch = false) => {
    if (!drawing) return;
    const maskCanvas = maskCanvasRef.current;
    const ctx = maskCanvas.getContext("2d");
    const rect = maskCanvas.getBoundingClientRect();
    let x = isTouch ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    let y = isTouch ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    if (tool === "brush") {
      ctx.fillStyle = "rgba(255,0,0,0.4)";
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === "eraser") {
      ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    }
  };

  const applyInpaint = async () => {
    if (!imageLoaded) return;
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const imageData = imageCanvas.toDataURL("image/png");
    const maskData = maskCanvas.toDataURL("image/png");

    try {
      const res = await fetch("http://localhost:8000/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, mask: maskData }),
      });
      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Inpaint failed:", err);
    }
  };

  const clearMask = () => {
    const maskCtx = maskCanvasRef.current.getContext("2d");
    maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ marginBottom: "10px" }}>
        <label>Brush Size: {brushSize}px</label>
        <input
          type="range"
          min="5"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          style={{ marginLeft: "10px" }}
        />
        <label style={{ marginLeft: "20px" }}>
          <input
            type="radio"
            name="tool"
            value="brush"
            checked={tool === "brush"}
            onChange={() => setTool("brush")}
          />
          Brush
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            name="tool"
            value="eraser"
            checked={tool === "eraser"}
            onChange={() => setTool("eraser")}
          />
          Eraser
        </label>
        <button onClick={clearMask} style={{ marginLeft: "20px", padding: "4px 10px" }}>
          Clear Mask
        </button>
      </div>

      <div style={{ position: "relative", width: "600px", height: "400px" }}>
        <canvas
          ref={imageCanvasRef}
          width={600}
          height={400}
          style={{ border: "1px solid #ccc" }}
        />
        <canvas
          ref={maskCanvasRef}
          width={600}
          height={400}
          style={{ position: "absolute", left: 0, top: 0, cursor: "crosshair" }}
          onMouseDown={(e) => { e.stopPropagation(); setDrawing(true); }}
          onMouseUp={(e) => { e.stopPropagation(); setDrawing(false); }}
          onMouseMove={(e) => { e.stopPropagation(); draw(e); }}
          onTouchStart={(e) => { e.stopPropagation(); setDrawing(true); draw(e, true); }}
          onTouchEnd={(e) => { e.stopPropagation(); setDrawing(false); }}
          onTouchMove={(e) => { e.stopPropagation(); draw(e, true); }}
        />
      </div>

      <button
        onClick={applyInpaint}
        style={{ marginTop: "10px", padding: "8px 16px" }}
      >
        Apply Brush Remove
      </button>

      {resultUrl && (
        <div style={{ marginTop: "20px" }}>
          <h4>Result:</h4>
          <img src={resultUrl} alt="Result" style={{ maxWidth: "100%" }} />
          <a href={resultUrl} download="cleaned.png" style={{ display: "block", marginTop: "10px" }}>
            Download
          </a>
        </div>
      )}
    </div>
  );
}

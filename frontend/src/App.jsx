import { useState, useRef } from "react";
import "./App.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import sparkleIcon from "./assets/sparkle-icon.png";
import demoBefore from "./assets/demo-before.jpg";
import demoAfter from "./assets/demo-after.jpg";

export default function App() {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState([]);
  const [resultUrls, setResultUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const inputRef = useRef();
  const dropZoneRef = useRef();

  // ***** REQUIRED CHANGE: Set the API Base URL *****
  // This is the correct, live URL for your Render backend.
  const API_BASE_URL = "https://watermark-remover-api-eenv.onrender.com";

  const MAX_SIZE_MB = 10;

  const validateFile = (f) => {
    if (!f.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image too large. Max allowed size is ${MAX_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const onFileChange = (e) => {
    const files = e.target.files;
    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      if (validateFile(files[i])) {
        validFiles.push(files[i]);
        setPreview((prev) => [...prev, URL.createObjectURL(files[i])]);
      }
    }
    setFiles(validFiles);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    const validFiles = [];
    for (let i = 0; i < droppedFiles.length; i++) {
      if (validateFile(droppedFiles[i])) {
        validFiles.push(droppedFiles[i]);
        setPreview((prev) => [...prev, URL.createObjectURL(droppedFiles[i])]);
      }
    }
    setFiles(validFiles);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 1));

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const removeWatermark = async () => {
    if (!files.length) return;
    setLoading(true);
    setError("");
    setResultUrls([]);

    const API_ENDPOINT = `${API_BASE_URL}/api/remove-watermark`; // <-- API URL IS NOW DYNAMIC

    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(API_ENDPOINT, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const msg = await safeJson(res);
          throw new Error(msg?.error || `Request failed (${res.status})`);
        }

        const blob = await res.blob();
        setResultUrls((prevUrls) => [...prevUrls, URL.createObjectURL(blob)]);
      }
    } catch (err) {
      setError(err.message || "Processing failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPreview([]);
    setResultUrls([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const slider = e.target.closest(".slider");
    if (!slider) return;
    const container = slider.parentElement;
    const afterDiv = container.querySelector(".after");

    slider.setPointerCapture(e.pointerId);

    const update = (clientX) => {
      const rect = container.getBoundingClientRect();
      let posX = clientX - rect.left;
      posX = Math.max(0, Math.min(posX, rect.width));
      const percent = (posX / rect.width) * 100;
      slider.style.left = `${percent}%`;
      afterDiv.style.width = `${percent}%`;
    };

    const onPointerMove = (evt) => update(evt.clientX);
    const onPointerUp = () => {
      slider.releasePointerCapture(e.pointerId);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    update(e.clientX);
  };

  const DemoSlider = () => (
    <div className="before-after-container">
      <img src={demoBefore} alt="Before Demo" className="before" />
      <img src={demoAfter} alt="After Demo" className="after" />
      <div className="slider" onPointerDown={handlePointerDown}>
        <div className="slider-button"></div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <section className="hero">
        <h1 className="title">
          Remove Watermark from your photos with AI{" "}
          <img src={sparkleIcon} alt="Sparkle" className="sparkle" />
        </h1>
        <p className="subtitle">
          Upload an image, then click remove. Our AI handles the cleanup while preserving quality.
        </p>
      </section>

      <section className="upload">
        <div
          className="dropzone"
          ref={dropZoneRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            style={{ display: "none" }}
            multiple
          />
          {!preview.length ? (
            <>
              <i className="fas fa-upload" style={{ fontSize: "2rem", marginRight: "10px" }}></i>
              <p className="helper">Click or drag & drop an image here</p>
            </>
          ) : (
            preview.map((image, index) => (
              <img
                key={index}
                src={image}
                alt="preview"
                className="preview"
                style={{ transform: `scale(${zoom})` }}
              />
            ))
          )}
        </div>

        {error && <div className="error">⚠ {error}</div>}

        <div className="actions">
          <button
            className={`btn primary ${loading ? "disabled" : ""}`}
            onClick={removeWatermark}
            disabled={!files.length || loading}
          >
            <i className="fas fa-magic" style={{ marginRight: "8px" }}></i>
            {loading ? "Processing..." : "Remove Watermark"}
          </button>
          <button className="btn" onClick={reset} disabled={loading}>
            <i className="fas fa-redo" style={{ marginRight: "8px" }}></i>
            Reset
          </button>
        </div>

        {preview.length > 0 && (
          <div className="zoom-controls">
            <button className="btn" onClick={handleZoomIn}>Zoom In</button>
            <button className="btn" onClick={handleZoomOut}>Zoom Out</button>
          </div>
        )}
      </section>

      {resultUrls.length > 0 && (
        <section className="result">
          <h3 className="section-heading">Results</h3>
          {resultUrls.map((url, index) => (
            <div key={index} className="result-item" style={{ textAlign: "center" }}>
              <img src={url} alt={`cleaned-${index}`} className="cleaned-image" />
              <a href={url} download={`cleaned_${index + 1}.png`} className="btn download" style={{ marginTop: "10px" }}>
                <i className="fas fa-download" style={{ marginRight: "8px" }}></i>
                Download
              </a>
            </div>
          ))}
        </section>
      )}

      <section className="showcase">
        <h2 className="section-heading">See Before & After Demo</h2>
        <DemoSlider />
      </section>

      <section className="how-it-works">
        <h2 className="section-heading">How to Remove Watermarks</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <i className="fas fa-upload step-icon"></i>
            <h3>Upload watermarked images</h3>
            <p>Drag & drop or choose a file from your device.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <i className="fas fa-magic step-icon"></i>
            <h3>AI removes watermarks automatically</h3>
            <p>Our AI scans and cleans your photo in seconds.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <i className="fas fa-paint-brush step-icon"></i>
            <h3>Use AI brush for pixel‑perfect results</h3>
            <p>Brush away any remaining traces with precision.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <i className="fas fa-download step-icon"></i>
            <h3>Download your clean photo</h3>
            <p>Save the original or HD version watermark‑free.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

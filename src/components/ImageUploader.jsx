import React, { useCallback, useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';

export default function ImageUploader({ onImageScanned }) {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  const processImage = useCallback(async (file) => {
    if (!file) return;

    const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!envApiKey || envApiKey === 'your_gemini_api_key_here') {
      setError(`Error: Key is missing. Value is: ${envApiKey}`);
      return;
    }
    
    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setIsScanning(true);

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(envApiKey);

      // Convert file to base64 for Gemini
      const fileBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const filePart = {
        inlineData: {
          data: fileBase64,
          mimeType: file.type
        }
      };

      const prompt = `
        Analyze this bill/invoice image. Extract the following details accurately and return ONLY a strict JSON object. No markdown, no backticks, no other text.
        Make sure you extract numbers accurately. If a field is missing, leave it as an empty string.

        {
          "title": "Shop Title/Name (if any)",
          "date": "Date of bill in DD-MM-YYYY format",
          "mobNo": "Mobile Number",
          "name": "Customer Name",
          "items": [
            {
              "sno": "Serial Number",
              "part": "Particulars/Description",
              "unit": "Unit/Quantity (number)",
              "rate": "Rate/Price (number)",
              "amount": "Total Amount (number)"
            }
          ]
        }
      `;

      const modelsToTry = [
        "gemini-flash-latest", 
        "gemini-2.5-flash", 
        "gemini-2.0-flash", 
        "gemini-1.5-flash",
        "gemini-pro-latest"
      ];
      let success = false;
      let lastError = null;
      let text = "";

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, filePart]);
          text = result.response.text();
          success = true;
          break;
        } catch (e) {
          console.warn(`Model ${modelName} failed:`, e.message);
          lastError = e;
        }
      }

      if (!success) {
        throw lastError;
      }
      
      // Attempt to parse JSON safely
      let parsedData;
      try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(jsonStr);
      } catch {
        console.error("Failed to parse Gemini response as JSON", text);
        setError("AI returned invalid format. Please try again.");
        setIsScanning(false);
        return;
      }

      onImageScanned(parsedData);
      
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during scanning.");
    } finally {
      setIsScanning(false);
    }
  }, [onImageScanned]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  }, [processImage]);

  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>
        <Sparkles size={18} style={{ color: 'var(--primary)' }} />
        AI Bill Scanner
      </h2>
      
      {error && (
        <div style={{ 
          color: 'var(--danger)', 
          marginBottom: '0.75rem', 
          padding: '0.5rem 0.75rem', 
          background: 'rgba(220,53,69,0.08)', 
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.85rem',
          border: '1px solid rgba(220,53,69,0.15)'
        }}>
          {error}
        </div>
      )}

      <div 
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Upload className="dropzone-icon" />
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem', fontSize: '0.9rem' }}>Click or drag bill image to scan</p>
          <p style={{ fontSize: '0.8rem' }}>Supports JPG, PNG, WEBP</p>
        </div>
        <input 
          id="file-input"
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={onFileChange}
        />
      </div>

      {imagePreview && (
        <div className="image-preview" style={{ position: 'relative' }}>
          <img src={imagePreview} alt="Bill Preview" />
          {isScanning && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <span style={{ marginBottom: '10px' }}>AI is extracting details...</span>
              <div className="progress-bar-container">
                <div className="progress-bar-fill"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

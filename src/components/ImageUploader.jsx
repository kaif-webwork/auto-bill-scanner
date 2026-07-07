import React, { useCallback, useState } from 'react';
import { Upload, Sparkles, Zap, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ImageUploader({ onImageScanned }) {
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [aiModel, setAiModel] = useState('mistral'); // 'gemini', 'mistral', 'ollama'

  const SCAN_PROMPT = `You are an expert OCR and data extraction system for Indian bills and invoices.

TASK: Carefully analyze this bill/invoice image and extract ALL data with 100% accuracy.

CRITICAL RULES:
- Read EVERY number digit by digit. Do NOT miss any decimals (e.g. 10.50).
- Look carefully at the column headers (e.g. "Unit", "Rate").
- The number under the "Unit" or "Qty" column MUST go into the "unit" JSON field.
- The number under the "Rate" or "Price" column MUST go into the "rate" JSON field.
- Never swap these numbers. Map them exactly as the column headers dictate.
- "Amount" is Unit multiplied by Rate. Extract EXACT values as shown in the bill. Do NOT calculate them yourself.
- CRITICAL: DO NOT INVENT OR GUESS NUMBERS. ONLY use numbers that are visibly written on the image.
- EXAMPLE: If the image shows an item "Apple" with Unit "50" and Rate "12", then the JSON MUST have "unit": "50" and "rate": "12".
- Serial numbers: If present, extract exactly. If NOT explicitly written in the bill, you MUST auto-generate them sequentially (1, 2, 3, etc.) for each item.
- Customer name must be extracted exactly as written (preserve spelling).
- Date must be in DD-MM-YYYY format. If date shows "6/7/2026", convert to "06-07-2026".
- Mobile number must be the exact digits shown.
- For "Particulars" column: extract the FULL item description exactly as written. Do NOT shorten or summarize it.
- Only include rows that have actual purchased items. 
- EXTREMELY IMPORTANT: Do NOT include table headers (like "Date", "Particulars", "Unit", "Rate", "Amount") as items in the list. Skip the header row completely.
- If a field is not visible or not present in the bill, use empty string "".
- EXTREMELY IMPORTANT: If the image is CLEARLY NOT a bill, invoice, or receipt (e.g., a photo of a person, animal, landscape, or a random object), you MUST return exactly this JSON: { "error": "NOT_A_BILL" }. Do not attempt to guess or extract data from non-bill images.

Return ONLY a JSON object (no markdown, no backticks, no extra text) with this exact structure:
{
  "title": "Shop/Business name from the bill header",
  "date": "DD-MM-YYYY",
  "mobNo": "Mobile number if visible",
  "name": "Customer name",
  "items": [
    {
      "sno": "Serial number",
      "part": "Item description / Particulars",
      "unit": "Quantity as a number string",
      "rate": "Rate/Price per unit as a number string",
      "amount": "Total amount for this item as a number string"
    }
  ]
}`;

  // ---------- OPENROUTER SCAN ----------
  const scanWithOpenRouter = async (fileBase64, mimeType) => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      throw new Error('OpenRouter API key missing. Add VITE_OPENROUTER_API_KEY to .env file.');
    }

    setScanStatus('Connecting to OpenRouter AI...');

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.5-flash",
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": SCAN_PROMPT
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:${mimeType};base64,${fileBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API failed: ${errorData.error?.message || response.statusText}`);
    }

    const json = await response.json();
    return json.choices[0].message.content || '';
  };

  // ---------- MISTRAL SCAN ----------
  const scanWithMistral = async (dataUrl) => {
    const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    if (!apiKey || apiKey === 'your_mistral_api_key_here') {
      throw new Error('Mistral API key missing. Add VITE_MISTRAL_API_KEY to .env file.');
    }

    setScanStatus('Scanning with Mistral AI...');

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409', // Mistral's vision model
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SCAN_PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  };

  // ---------- GEMINI SCAN ----------
  const scanWithGemini = async (fileBase64, mimeType) => {
    setScanStatus('Scanning with Gemini AI...');
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key missing. Add VITE_GEMINI_API_KEY to .env file.');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SCAN_PROMPT },
            {
              inlineData: {
                mimeType: mimeType,
                data: fileBase64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API failed: ${errorData.error?.message || response.statusText}`);
    }

    const json = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  // ---------- PARSE JSON ----------
  const parseJSON = (text) => {
    try {
      return JSON.parse(text.trim());
    } catch {
      try {
        let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && end > start) {
          const jsonStr = cleaned.substring(start, end + 1);
          return JSON.parse(jsonStr);
        }
        throw new Error('No JSON brackets found');
      } catch (err) {
        console.error('Failed to parse AI response. Raw text was:', text);
        console.error('Parse error:', err);
        // Remove the duplicate toast here, the catch block in processImage will handle it
        throw new Error('This image does not look like a valid bill, or the AI could not read it clearly.');
      }
    }
  };

  // ---------- MAIN PROCESS ----------
  const processImage = useCallback(async (file) => {
    if (!file) return;
    setScanStatus('');
    
    const previewReader = new FileReader();
    previewReader.onload = (e) => setImagePreview(e.target.result);
    previewReader.readAsDataURL(file);

    setIsScanning(true);

    try {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      const base64Only = dataUrl.split(',')[1];
      let responseText = '';

      if (aiModel === 'gemini') {
        responseText = await scanWithGemini(base64Only, file.type);
      } else if (aiModel === 'mistral') {
        responseText = await scanWithMistral(dataUrl);
      } else {
        responseText = await scanWithOpenRouter(base64Only, file.type);
      }

      if (!responseText) {
        throw new Error('AI returned empty response. Please try again.');
      }

      setScanStatus('Parsing results...');
      const parsedData = parseJSON(responseText);
      
      // Check if AI explicitly flagged this as NOT a bill
      if (parsedData.error === 'NOT_A_BILL') {
        throw new Error('This image does not look like a bill. Please upload a valid receipt or invoice.');
      }
      
      // Validate if the AI actually found any useful bill data
      const hasItems = parsedData.items && parsedData.items.length > 0;
      const hasTitle = parsedData.title && parsedData.title.trim() !== '';

      if (!hasItems && !hasTitle) {
        throw new Error('Could not find enough details. Please upload a clearer bill image.');
      }

      onImageScanned(parsedData);
      toast.success('Bill scanned successfully!');
      
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'An error occurred during scanning.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onImageScanned, aiModel]);

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
      // Reset input value so the same file can be uploaded again
      e.target.value = null;
    }
  };

  return (
    <div className="glass-panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>
        <Sparkles size={18} style={{ color: 'var(--primary)' }} />
        AI Bill Scanner
      </h2>

      {/* AI Model Selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setAiModel('openrouter')}
          className={`template-btn ${aiModel === 'openrouter' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
        >
          <Zap size={14} /> OpenRouter
        </button>
        <button
          onClick={() => setAiModel('mistral')}
          className={`template-btn ${aiModel === 'mistral' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
        >
          <ImageIcon size={14} /> Mistral
        </button>
        <button
          onClick={() => setAiModel('gemini')}
          className={`template-btn ${aiModel === 'gemini' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center' }}
        >
          <Sparkles size={14} /> Gemini
        </button>
      </div>

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
              <span className="scan-status-text">
                {scanStatus || 'Processing...'}
              </span>
              <div className="premium-progress-container">
                <div className="premium-progress-fill"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

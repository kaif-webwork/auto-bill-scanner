import React, { useEffect, useState, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { numberToWords } from '../utils/numberToWords';

export default function BillForm({ billData, onUpdate, template = 'default' }) {
  const billRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const getEmptyBillData = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');

    return {
      title: 'ARZOO INDEX CUTTING',
      date: formattedDate,
      mobNo: '',
      name: '',
      words: '',
      items: Array(8).fill({ sno: '', part: '', unit: '', rate: '', amount: '' })
    };
  };

  const [data, setData] = useState(getEmptyBillData());

  // Sync when billData from AI arrives
  useEffect(() => {
    if (billData) {
      // pad with empty rows to have at least 8 rows
      const paddedItems = (billData.items || []).map(item => ({...item}));
      while (paddedItems.length < 8) {
        paddedItems.push({ sno: '', part: '', unit: '', rate: '', amount: '' });
      }
      setData(prevData => {
        const newData = {
          ...prevData,
          date: billData.date || '',
          mobNo: billData.mobNo || '',
          name: billData.name || '',
          items: paddedItems.slice(0, 8)
        };
        return calculateTotals(newData);
      });
    }
  }, [billData]);

  // Calculate whenever data changes
  const calculateTotals = (currentData) => {
    let grandTotal = 0;
    const newItems = currentData.items.map(item => {
      const unit = parseFloat(item.unit) || 0;
      const rate = parseFloat(item.rate) || 0;
      
      // If amount is manually set and rate is 0, keep amount. Otherwise calculate.
      // But auto-calc is preferred. Let's just do Unit * Rate if both exist, else keep amount.
      let amount = parseFloat(item.amount) || 0;
      if (unit > 0 && rate > 0) {
        amount = Math.round(unit * rate);
      }
      
      grandTotal += amount;
      
      return { ...item, amount: amount > 0 ? amount : '' };
    });

    const newWords = numberToWords(grandTotal);

    return {
      ...currentData,
      items: newItems,
      grandTotal,
      words: newWords
    };
  };

  const handleChange = (field, value) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      if (onUpdate) onUpdate(newData);
      return newData;
    });
  };

  const handleItemChange = (index, field, value) => {
    setData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      const item = newItems[index];
      if (field === 'unit' || field === 'rate') {
         const u = parseFloat(item.unit) || 0;
         const r = parseFloat(item.rate) || 0;
         if (u && r) {
            item.amount = Math.round(u * r);
         }
      }

      const newData = calculateTotals({ ...prev, items: newItems });
      if (onUpdate) onUpdate(newData);
      return newData;
    });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const newItems = [...data.items];
      
      // Auto-fill next S.No
      if (index + 1 < newItems.length) {
        const currentSno = newItems[index].sno;
        if (currentSno && !newItems[index + 1].sno) {
           const match = currentSno.match(/^0*(\d+)$/);
           if (match) {
             const num = parseInt(match[1], 10) + 1;
             const hasLeadingZero = currentSno.startsWith('0') && currentSno.length > 1;
             newItems[index + 1].sno = hasLeadingZero ? num.toString().padStart(2, '0') : num.toString();
             
             const newData = calculateTotals({ ...data, items: newItems });
             setData(newData);
             if (onUpdate) onUpdate(newData);
           }
        }
        
        // Focus next row's particulars field
        const nextPartInput = document.getElementById(`part-${index + 1}`);
        if (nextPartInput) nextPartInput.focus();
      }
    }
  };

  const handleReset = () => {
    const emptyState = getEmptyBillData();
    setData(emptyState);
    if (onUpdate) onUpdate(emptyState);
  };

  const grandTotal = data.items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const displayWords = data.words || numberToWords(grandTotal);

  const captureBillImage = async () => {
    if (!billRef.current) return null;
    
    // Disable mobile layout completely during download
    document.body.classList.add('force-desktop');
    
    // Temporarily force wrapper and bill to massive desktop width
    const bill = billRef.current;
    const originalWidth = bill.style.width;
    const originalMaxWidth = bill.style.maxWidth;
    const wrapper = bill.parentElement;
    const originalWrapperWidth = wrapper.style.width;
    
    wrapper.style.width = '800px';
    bill.style.width = '800px';
    bill.style.maxWidth = '800px';
    
    // Give browser time to repaint the fonts to full desktop size
    await new Promise(r => setTimeout(r, 200));

    try {
      const imgData = await toJpeg(bill, { 
        quality: 1.0, 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: 800
      });
      return imgData;
    } catch (err) {
      console.error('Error in capture', err);
      return null;
    } finally {
      // Instantly return to beautiful mobile view
      bill.style.width = originalWidth;
      bill.style.maxWidth = originalMaxWidth;
      wrapper.style.width = originalWrapperWidth;
      document.body.classList.remove('force-desktop');
    }
  };

  const handleDownloadJPEG = async () => {
    if (!billRef.current) return;
    setIsDownloading(true);
    try {
      const imgData = await captureBillImage();
      if (!imgData) return;
      const link = document.createElement('a');
      link.download = `bill_${data.name || 'document'}.jpg`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error('Error generating JPEG', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!billRef.current) return;
    setIsDownloading(true);
    try {
      const imgData = await captureBillImage();
      if (!imgData) return;
      
      const width = billRef.current.offsetWidth;
      const height = billRef.current.offsetHeight;

      const pdfWidth = 210; // Standard A4 width in mm
      const pdfHeight = 297; // Standard A4 height in mm

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4' // FORCE exact A4 size
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`bill_${data.name || 'document'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!billRef.current) return;
    setIsDownloading(true);
    try {
      const imgData = await captureBillImage();
      if (!imgData) return;
      
      const response = await fetch(imgData);
      const blob = await response.blob();
      const file = new File([blob], `bill_${data.name || 'document'}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Bill Document',
          text: `Here is the bill for ${data.name || 'customer'}`
        });
      } else {
        alert("Your browser doesn't support native sharing yet. Please download the JPEG and share it directly.");
      }
    } catch (err) {
      console.error('Error sharing', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="action-buttons">
        <button 
          onClick={handleDownloadPDF} 
          disabled={isDownloading}
          className="btn-download btn-pdf"
        >
          {isDownloading ? 'Processing...' : 'Download PDF'}
        </button>
        <button 
          onClick={handleDownloadJPEG} 
          disabled={isDownloading}
          className="btn-download btn-jpeg"
        >
          {isDownloading ? 'Processing...' : 'Download JPEG'}
        </button>
        <button 
          onClick={handleShare} 
          disabled={isDownloading}
          className="btn-download btn-share"
        >
          {isDownloading ? 'Processing...' : 'Share Bill'}
        </button>
        <button 
          onClick={handleReset} 
          className="btn-reset"
        >
          Reset Bill
        </button>
      </div>
      
      <div className="bill-wrapper">
        <div className={`bill-container template-${template}`} ref={billRef}>
          <div className="bill-header-row">
            <div className="bill-info-box">
          Date - <input type="text" value={data.date} onChange={(e) => handleChange('date', e.target.value)} />
        </div>
        <div className="bill-info-box">
          Mob No : &nbsp;8586874432
        </div>
      </div>

      <div className="bill-title">
        ARZOO INDEX CUTTING
      </div>

      <div className="bill-name-row">
        Name :
        <input 
          type="text" 
          className="bill-name-input" 
          value={data.name} 
          onChange={(e) => handleChange('name', e.target.value)} 
        />
      </div>

      <table className="bill-table">
        <thead>
          <tr>
            <th className="col-sno">S.No</th>
            <th className="col-part">Particulars</th>
            <th className="col-unit">Unit</th>
            <th className="col-rate">Rate</th>
            <th className="col-amt">Amount</th>
          </tr>
        </thead>
      </table>
      
      <div className="table-body-wrapper">
        <div className="table-col col-sno">
          {data.items.map((item, i) => (
            <div className="row-item" key={`sno-${i}`}>
              <input 
                type="text" 
                value={item.sno} 
                onChange={e => handleItemChange(i, 'sno', e.target.value)} 
                onKeyDown={e => handleKeyDown(e, i)}
              />
            </div>
          ))}
        </div>
        <div className="table-col col-part">
          {data.items.map((item, i) => (
            <div className="row-item" key={`part-${i}`}>
              <input 
                id={`part-${i}`}
                type="text" 
                className="part-input" 
                value={item.part} 
                onChange={e => handleItemChange(i, 'part', e.target.value)} 
                onKeyDown={e => handleKeyDown(e, i)}
              />
            </div>
          ))}
        </div>
        <div className="table-col col-unit">
          {data.items.map((item, i) => (
            <div className="row-item" key={`unit-${i}`}>
              <input 
                type="text" 
                className="number-input"
                value={item.unit} 
                onChange={e => handleItemChange(i, 'unit', e.target.value)} 
                onKeyDown={e => handleKeyDown(e, i)}
              />
            </div>
          ))}
        </div>
        <div className="table-col col-rate">
          {data.items.map((item, i) => (
            <div className="row-item" key={`rate-${i}`}>
              <input 
                type="text" 
                className="number-input"
                value={item.rate} 
                onChange={e => handleItemChange(i, 'rate', e.target.value)} 
                onKeyDown={e => handleKeyDown(e, i)}
              />
            </div>
          ))}
        </div>
        <div className="table-col col-amt">
          {data.items.map((item, i) => (
            <div className="row-item" key={`amt-${i}`}>
              <input 
                type="text" 
                className="number-input"
                value={item.amount} 
                onChange={e => handleItemChange(i, 'amount', e.target.value)} 
                onKeyDown={e => handleKeyDown(e, i)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bill-footer">
        <div className="words-section">
          <span style={{ whiteSpace: 'nowrap' }}>Amount in words</span>
          <textarea 
            className="words-display" 
            value={displayWords} 
            onChange={(e) => handleChange('words', e.target.value)}
            rows={2}
          />
        </div>
        <div className="grand-total-label">Grand Total</div>
        <div className="grand-total-value">{grandTotal > 0 ? `₹ ${grandTotal.toLocaleString('en-IN')}` : ''}</div>
      </div>

      <div className="bill-signature-section">
        <div className="signature-box" style={{ position: 'relative' }}>
          <div className="stamp">
            ARZOO<br/>INDEX CUTTING
          </div>
          <img 
            src="/signature.jpg" 
            alt="Signature" 
            onError={(e) => e.target.style.display = 'none'}
            style={{ 
              width: '120px', 
              filter: 'grayscale(100%) contrast(300%) brightness(1.3)', 
              mixBlendMode: 'multiply',
              marginBottom: '-10px',
              position: 'relative',
              zIndex: 2
            }} 
          />
          <div className="signature-line"></div>
          <div>Authorized Signatory</div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}

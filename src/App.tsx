import React, { useState } from "react";
import { AlertCircle, FileText, CornerDownRight, Loader, Download, Upload } from "lucide-react";
import { jsPDF } from "jspdf";

// Types matching backend response schemas
interface MissingSkill {
  skill: string;
  groupTerms: string;
  priority: string;
  actionableRecommendation: string;
}

interface Alignment {
  status: string;
  explanation: string;
}

interface DetailedReport {
  formattingAndStructure: string;
  experienceGaps: string;
  overallVerdict: string;
}

interface AnalysisResponse {
  alignment: Alignment;
  missingSkills: MissingSkill[];
  detailedReport: DetailedReport;
}


// Extractor function using global window.pdfjsLib loaded from CDN
const extractTextFromPdf = (arrayBuffer: ArrayBuffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      reject(new Error("PDF.js library is not loaded yet in this session. Please refresh or verify network access."));
      return;
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    loadingTask.promise.then((pdf: any) => {
      const maxPages = pdf.numPages;
      const countPromises: Promise<string>[] = [];
      
      for (let i = 1; i <= maxPages; i++) {
        countPromises.push(
          pdf.getPage(i).then((page: any) => {
            return page.getTextContent().then((textContent: any) => {
              return textContent.items.map((item: any) => item.str).join(" ");
            });
          })
        );
      }

      Promise.all(countPromises)
        .then((pagesText) => {
          resolve(pagesText.join("\n\n"));
        })
        .catch(reject);
    }).catch(reject);
  });
};

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  // File Upload states
  const [fileLoading, setFileLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);


  const handleClear = () => {
    setResumeText("");
    setJobDescription("");
    setResult(null);
    setError(null);
    setUploadSuccess(null);
  };

  const runAnalysis = async () => {
    if (!resumeText.trim()) {
      setError("Please paste, type, or upload resume text before running the metrics optimization.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste or type the target job description before running the metrics optimization.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Server responded with an analysis failure.");
      }

      const data: AnalysisResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred during communication with the assessment pipeline.");
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop mechanics
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setUploadSuccess(null);

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Calibration mismatch. Supported format is PDF document only.");
      return;
    }

    setFileLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error("Unable to parse file stream.");
          }
          const text = await extractTextFromPdf(arrayBuffer);
          if (!text.trim()) {
            throw new Error("PDF contains no extractable alphanumeric characters. Ensure it is not a raw image scan.");
          }
          setResumeText(text);
          setUploadSuccess(`Extracted content successfully from '${file.name}'`);
        } catch (err: any) {
          setError(`File Parse Failure: ${err.message || err}`);
        } finally {
          setFileLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setError(`File loader error: ${err.message}`);
      setFileLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // PDF Exporter writing clean layout directly insidejsPDF format
  const exportReportAsPdf = (reportData: AnalysisResponse) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    let y = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    const checkPageEnd = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = 15;
        return true;
      }
      return false;
    };

    // Header Branding Line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("RESUME-ROLE ALIGNMENT REPORT", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`REPORT IDENTIFIER: RA-${Math.floor(1000 + Math.random() * 9000)}-TX | DATE: ${new Date().toISOString().split("T")[0]}`, margin, y);
    y += 8;

    // Line separator
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Domain status section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("01. COMPATIBILITY ASSESSMENT", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(180, 20, 20);
    doc.text(`VERDICT: ${reportData.alignment.status.toUpperCase()}`, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const explanationLines = doc.splitTextToSize(reportData.alignment.explanation, contentWidth);
    checkPageEnd(explanationLines.length * 5);
    doc.text(explanationLines, margin, y);
    y += (explanationLines.length * 5) + 10;

    // Technical missing Gaps
    checkPageEnd(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("02. EXTRACTED TECHNICAL GAPS & KEYWORDS", margin, y);
    y += 6;

    if (reportData.missingSkills.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("No specific technical gaps were detected.", margin, y);
      y += 10;
    } else {
      reportData.missingSkills.forEach((item, idx) => {
        checkPageEnd(25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`${idx + 1}. ${item.skill.toUpperCase()} [Priority: ${item.priority}]`, margin, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(`Associated Terminology Matches: ${item.groupTerms}`, margin, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const directives = doc.splitTextToSize(`Recommendation: ${item.actionableRecommendation}`, contentWidth - 4);
        doc.text(directives, margin, y);
        y += (directives.length * 4.5) + 6;
      });
    }

    y += 4;

    // Formatting & Structural Report
    checkPageEnd(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("03. RECRUITER AUDIT & STRUCTURE FEEDBACK", margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("A. FORMATTING & CONTENT HIERARCHY DIRECTIVES", margin, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const formatLines = doc.splitTextToSize(reportData.detailedReport.formattingAndStructure, contentWidth);
    doc.text(formatLines, margin, y);
    y += (formatLines.length * 4.5) + 8;

    checkPageEnd(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("B. TECHNICAL IMPACT & LEVEL GAP ANALYSIS", margin, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const expLines = doc.splitTextToSize(reportData.detailedReport.experienceGaps, contentWidth);
    doc.text(expLines, margin, y);
    y += (expLines.length * 4.5) + 10;

    // Overall verdict
    checkPageEnd(40);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 30, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("C. RECRUITER STRATEGIC VERDICT", margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const verdictLines = doc.splitTextToSize(reportData.detailedReport.overallVerdict, contentWidth - 8);
    doc.text(verdictLines, margin + 4, y + 11);
    y += 35;

    // Footer on bottom of current page
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("VALIDATED FOR PROFESSIONAL ATS TRANSITION BY THE ATS VALIDATION ENGINE", margin, pageHeight - 10);

    // Prompt user to save A4 report
    doc.save(`Alignment_Matrix_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Get metadata settings
  const getAlignmentMeta = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("strong")) {
      return {
        slug: "STRONG ALIGNMENT",
        percentage: "92%",
        desc: "Excellent matching. Candidate profile shows direct technical and industry qualification.",
        bgClass: "bg-emerald-50 border-emerald-500 text-emerald-800",
        labelColor: "text-emerald-700",
        valueColor: "text-emerald-900",
        badgeBorder: "border-emerald-200",
        strokeColor: "stroke-emerald-500",
        trackColor: "stroke-emerald-100"
      };
    }
    if (s.includes("partial")) {
      return {
        slug: "PARTIAL ALIGNMENT",
        percentage: "58%",
        desc: "Moderate match. Secondary tech stacks or supportive structural parameters are absent.",
        bgClass: "bg-amber-50 border-amber-500 text-amber-800",
        labelColor: "text-amber-700",
        valueColor: "text-amber-900",
        badgeBorder: "border-amber-200",
        strokeColor: "stroke-amber-500",
        trackColor: "stroke-amber-100"
      };
    }
    return {
      slug: "DOMAIN MISMATCH",
      percentage: "14%",
      desc: "Zero functional domain overlap detected across target requirements.",
      bgClass: "bg-[#fff1f0] border-l-4 border-l-[#cf1322] text-[#cf1322]",
      labelColor: "text-[#cf1322]",
      valueColor: "text-[#cf1322]",
      badgeBorder: "border-red-200",
      strokeColor: "stroke-red-500",
      trackColor: "stroke-red-100"
    };
  };

  const meta = result ? getAlignmentMeta(result.alignment.status) : null;

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 font-sans antialiased flex flex-col justify-between">
      
      {/* High Quality Corporate Header */}
      <header className="px-10 py-6 border-b border-slate-200 bg-white shadow-xs border-t-4 border-indigo-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-indigo-600 rounded-xs"></span>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                RESUMATCH AI
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold tracking-wider mt-2.5 uppercase">
              Analyze. Match. Get Hired.
            </p>
          </div>
          <div className="text-[10px] font-mono text-indigo-700 border border-indigo-150 px-3 py-1 bg-indigo-50/30 rounded uppercase tracking-widest font-semibold text-right">
            TECHNICAL RECRUITING VALIDATION MATRIX
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-10 flex-1 flex flex-col gap-8">
        
        {/* Layout Grid: Inputs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto min-h-[380px]" id="section-inputs">
          
          {/* Resume Box with Integrated File Dropper & Paste Option */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-lg p-5 justify-between h-full shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <label 
                htmlFor="resume-input" 
                className="text-[11px] font-bold text-slate-650 uppercase tracking-wider flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Source: Resume Content (PDF file or Paste text)
              </label>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">
                {resumeText ? resumeText.trim().split(/\s+/).filter(Boolean).length : 0} words
              </span>
            </div>

            {/* Custom Interactive File Pick Drag Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border border-dashed rounded-md p-5 text-center mb-4 transition-colors ${
                dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-300"
              }`}
            >
              <input
                type="file"
                id="resume-file-picker"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <label htmlFor="resume-file-picker" className="cursor-pointer block">
                {fileLoading ? (
                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] uppercase font-bold tracking-tight">Extracting PDF text vectors...</span>
                  </div>
                ) : uploadSuccess ? (
                  <div className="text-emerald-700">
                    <span className="text-[10px] uppercase font-bold tracking-tight block">LOADED SUCCESSFULLY</span>
                    <span className="text-[9px] font-mono opacity-80 block truncate mt-1">{uploadSuccess}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span className="text-[10px] uppercase font-bold text-indigo-900 tracking-wider">
                        DRAG & DROP RESUME PDF
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      or click to select your PDF file for high accuracy keyword parsing
                    </span>
                  </div>
                )}
              </label>
            </div>
            
            <textarea
              id="resume-input"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full flex-1 min-h-[160px] text-slate-800 font-sans text-xs p-3 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-md resize-none bg-slate-50/30 placeholder-slate-400 leading-relaxed font-normal"
              placeholder="Or paste candidate's full resume text manually here..."
            />
          </div>

          {/* Job Requirements Box */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-lg p-5 justify-between h-full shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <label 
                htmlFor="job-desc-input" 
                className="text-[11px] font-bold text-slate-650 uppercase tracking-wider flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Target: Job Description
              </label>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">
                {jobDescription ? jobDescription.trim().split(/\s+/).filter(Boolean).length : 0} words
              </span>
            </div>
            
            <textarea
              id="job-desc-input"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full flex-1 text-slate-800 font-sans text-xs p-3 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-md resize-none bg-slate-50/30 placeholder-slate-400 leading-relaxed font-normal"
              placeholder="Paste target job listing, core technical requirements, and target responsibilities here..."
            />
          </div>
        </div>

        {/* CTA triggers */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full sm:w-auto min-w-[240px] bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-8 hover:bg-indigo-700 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer border border-transparent rounded-md shadow-xs active:scale-[0.98]"
            id="btn-analyze"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-white/80" />
                Processing calibration...
              </>
            ) : (
              "Analyze Application Match"
            )}
          </button>

          <button
            onClick={handleClear}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3.5 font-bold text-xs text-slate-650 hover:text-slate-905 bg-white hover:bg-slate-50 border border-slate-250 hover:border-slate-350 rounded-md transition-all uppercase tracking-widest cursor-pointer"
            id="btn-clear-fields"
          >
            Reset Form
          </button>
        </div>

        {error && (
          <div className="w-full max-w-3xl mx-auto mt-2 bg-red-50 border border-red-200 rounded-md p-4 text-xs flex gap-3 text-red-950 shadow-2xs animate-fade-in" id="error-box">
            <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
            <div>
              <p className="font-bold uppercase tracking-wider text-red-900">Calibration Interrupted</p>
              <p className="mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Visual placeholder */}
        {loading && (
          <div className="border border-indigo-100 bg-indigo-50/20 rounded-lg p-12 text-center flex flex-col items-center justify-center shadow-xs animate-pulse">
            <Loader className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-800">
              Generating Calibration Matrix
            </span>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">
              Analyzing core domain vectors, matching synonyms, compiling dynamic action list...
            </span>
          </div>
        )}

        {/* High Density Report Block */}
        {result && meta && (
          <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 lg:grid-cols-[280px_1fr] shadow-sm overflow-hidden animate-fade-in" id="analysis-results">
            
            {/* Embedded Left Column Sidebar of High Density report */}
            <aside className="border-r border-b lg:border-b-0 border-slate-200 p-6 flex flex-col gap-6 bg-slate-50/50">
              
              {/* Dynamic Status Badge */}
              <div className={`p-4 rounded-md border-l-4 ${meta.bgClass} shadow-xs`}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-90">
                  Compatibility State
                </div>
                <div className="text-base font-black tracking-tight">
                  {meta.slug}
                </div>
              </div>

              {/* Score Value panel with Circular Progress Dial */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col items-center text-center shadow-xs">
                <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                  {/* SVG Circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={`${meta.trackColor} fill-none`}
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className={`${meta.strokeColor} fill-none transition-all duration-700 ease-out`}
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * (parseInt(meta.percentage) || 14)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {meta.percentage}
                    </span>
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                      MATCH INDEX
                    </span>
                  </div>
                </div>

                <div className="w-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Core Alignment Index
                  </span>
                  <p className="text-[11px] text-slate-650 mt-1.5 leading-relaxed">
                    {meta.desc}
                  </p>
                </div>
              </div>

              <hr className="border-slate-250" />

              {/* Export Direct Report Action */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-550 block">
                  Report Actions
                </span>
                <button
                  onClick={() => exportReportAsPdf(result)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-widest py-3 px-4 transition border border-transparent rounded-md text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                  id="btn-export-pdf"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF Report
                </button>
              </div>

              <hr className="border-slate-250" />

              {/* Recruiter System Logs feedback */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                  System Logs
                </span>
                <p className="text-[10px] text-slate-600 leading-relaxed font-mono bg-slate-100 p-2.5 border border-slate-200 rounded">
                  Analysis complete. Filtered generic terms. Synonyms consolidated. Identified missing technical targets accurately.
                </p>
              </div>
            </aside>

            {/* Embedded Right Column Content block of High Density report */}
            <div className="p-8 space-y-8 flex flex-col justify-between">
              
              {/* Part 1: Domain Analysis */}
              <section id="section-alignment">
                <div className="text-xs font-extrabold text-slate-900 border-b-2 border-indigo-600 pb-2.5 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded"></span>
                  Domain Analysis
                </div>
                <p className="text-sm text-slate-750 leading-relaxed font-normal whitespace-pre-line">
                  {result.alignment.explanation}
                </p>
              </section>

              {/* Part 2: Critical Skill Gaps */}
              <section id="section-gaps">
                <div className="text-xs font-extrabold text-slate-900 border-b-2 border-indigo-600 pb-2.5 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded"></span>
                  Critical Skill Gaps
                </div>
                
                {result.missingSkills.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">
                    No significant technical gaps or skill discrepancies were identified.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.missingSkills.map((spec, idx) => (
                      <span 
                        key={idx} 
                        className="inline-block py-1.5 px-3 border border-indigo-200 rounded text-xs font-semibold text-indigo-950 uppercase tracking-wide bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 transition"
                        title={`Synonyms: ${spec.groupTerms || "None"}. Priority: ${spec.priority}`}
                      >
                        {spec.skill}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Part 3: Detailed Technical Requirements recommendations list */}
              <section id="section-detailed-specs" className="space-y-4">
                <div className="text-xs font-extrabold text-slate-900 border-b-2 border-indigo-600 pb-2.5 mb-3 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded"></span>
                  Targeted Keyword Modifications
                </div>

                {result.missingSkills.length > 0 && (
                  <div className="border border-slate-200 overflow-hidden rounded-md shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-indigo-50/30 border-b border-slate-200">
                          <th className="py-3 px-4 font-bold text-slate-750 uppercase tracking-wider text-[10px] w-4/12">
                            Consolidated Skill
                          </th>
                          <th className="py-3 px-4 font-bold text-slate-750 uppercase tracking-wider text-[10px] w-2/12 text-center">
                            Priority
                          </th>
                          <th className="py-3 px-4 font-bold text-slate-750 uppercase tracking-wider text-[10px] w-6/12">
                            Update Directives
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.missingSkills.map((spec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{spec.skill}</span>
                              <span className="text-[10px] text-slate-400 font-mono italic">
                                synonym matches: {spec.groupTerms}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded border ${
                                spec.priority.toLowerCase().includes("high") 
                                  ? "bg-red-50 text-red-900 border-red-200" 
                                  : "bg-indigo-50 text-indigo-900 border-indigo-155"
                              }`}>
                                {spec.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 leading-relaxed font-sans">
                              <span className="flex items-start gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                <span>{spec.actionableRecommendation}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Part 4: Dynamic Recommendations & Structure */}
              <section id="section-detailed-memo" className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-150">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#4f46e5]">
                    A. Formatting & Content Hierarchy
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50 p-4 rounded border border-slate-200">
                    {result.detailedReport.formattingAndStructure}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#4f46e5]">
                    B. Technical Focus & Experience Gaps
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50 p-4 rounded border border-slate-200">
                    {result.detailedReport.experienceGaps}
                  </p>
                </div>
              </section>

              {/* Final Professional Action plan */}
              <section id="section-verdict" className="bg-slate-900 text-white p-5 rounded-md mt-4 shadow-sm">
                <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
                  Strategic Advisor Overall Verdict
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                  {result.detailedReport.overallVerdict}
                </p>
              </section>

            </div>
          </div>
        )}

      </main>

      {/* Footer Info */}
      <footer className="footer-info text-[11px] text-neutral-400 text-center py-6 mt-12 border-t border-neutral-200 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto px-10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="uppercase tracking-widest font-semibold text-[10px]">
            Analysis Provided by ResuMatch AI
          </span>
          <span className="font-mono text-neutral-400 text-[10px]">
            DEVELOPED BY ASIFA H
          </span>
        </div>
      </footer>

    </div>
  );
}

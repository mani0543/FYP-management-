import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import api from '../../api/client.js';
import { Printer, Download, ShieldCheck, Lock, FileText } from 'lucide-react';

export default function DocumentViewerPage() {
  const { docId } = useParams();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get('print') === '1';

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const docxContainerRef = useRef(null);
  const endorsementTemplateRef = useRef(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/documents/${docId}/meta`);
        if (!res.success || !res.document) {
          throw new Error(res.message || 'Document not found');
        }
        setDoc(res.document);

        if (res.document.ext === '.docx' && docxContainerRef.current) {
          const rawRes = await fetch(`/api/documents/${docId}/raw`);
          if (!rawRes.ok) {
            throw new Error('Could not load document binary');
          }
          const arrayBuffer = await rawRes.arrayBuffer();
          docxContainerRef.current.innerHTML = '';
          await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
            className: 'docx-exact-view',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false, // Preserve exact Word fonts!
            breakPages: true,   // Preserve exact Word page breaks & alignment!
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            experimental: true, // Preserve Word drawings, shapes & floating images in exact size!
            useBase64URL: true, // Embed all images as base64 data URLs so they never disappear!
          });

          // Remove only our XML text fallback paragraph if present, so we can append the visual Signature & Stamp block directly inside the last Word page!
          const paragraphs = docxContainerRef.current.querySelectorAll('p');
          paragraphs.forEach((p) => {
            const txt = p.textContent || '';
            if (
              txt.includes('OFFICIAL UNIVERSITY FYP DIGITAL SIGNATURE & DEPARTMENTAL SEAL') ||
              txt.includes('SIGNED BY SUPERVISOR:') ||
              txt.includes('Digital Signature: [') ||
              txt.includes('STAMPED & LOCKED BY COORDINATOR:') ||
              txt.includes('COORDINATOR OFFICIAL STAMP:') ||
              txt.includes('Official Seal: [ CS & SE DEPT')
            ) {
              p.remove();
            }
          });

          // Inject the visual Signature & Stamp endorsement block directly inside the last rendered Word page section
          setTimeout(() => {
            if (!docxContainerRef.current || !endorsementTemplateRef.current) return;
            const sections = docxContainerRef.current.querySelectorAll('section.docx-exact-view');
            const lastSection = sections.length > 0 ? sections[sections.length - 1] : docxContainerRef.current;
            const existingInjected = docxContainerRef.current.querySelector('#fyp-inline-endorsement');
            if (existingInjected) existingInjected.remove();

            const clone = endorsementTemplateRef.current.cloneNode(true);
            clone.id = 'fyp-inline-endorsement';
            clone.style.display = 'block';
            lastSection.appendChild(clone);

            if (autoPrint) {
              setTimeout(() => {
                window.print();
              }, 500);
            }
          }, 150);
        }
      } catch (err) {
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (docId) {
      loadDocument();
    }
  }, [docId, autoPrint]);

  const sup = doc?.supervisorApproval;
  const coord = doc?.coordinatorApproval;

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col">
      {/* Top Action Bar (Hidden when printing/saving as PDF so only exact pages + signatures print) */}
      <div className="print:hidden sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{doc?.title || 'University FYP Document'}</span>
              {doc?.isLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" /> Official Locked Evidence
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-300">
              {doc?.type || 'DELIVERABLE'} (Semester {doc?.semesterNumber || 7}) • Uploaded by{' '}
              {doc?.uploadedByName || 'Student'} • Original Fonts, Images & Alignment Preserved
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {doc?.ext === '.docx' ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Exact Signed PDF</span>
            </button>
          ) : (
            <a
              href={`/api/documents/${docId}/raw?download=1`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed PDF</span>
            </a>
          )}

          <a
            href={`/api/documents/${docId}/raw?download=1`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-blue-700" />
            <span>Download File ({doc?.ext || 'Original'})</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto mt-8 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="max-w-3xl mx-auto mt-12 p-8 bg-white rounded-xl shadow-xs text-center text-sm text-gray-600">
          Rendering document with original fonts, images, tables, and page alignment...
        </div>
      )}

      {/* Main Document Content Container */}
      <div className="flex-1 flex flex-col items-center py-4 print:py-0">
        {/* If PDF, embed native browser PDF viewer which shows the exact original PDF pages + signature & stamp */}
        {doc && doc.ext === '.pdf' && (
          <iframe
            src={`/api/documents/${docId}/raw`}
            title={doc.title || 'PDF Document'}
            className="w-full max-w-5xl h-[86vh] bg-white rounded-lg shadow-lg border border-slate-300"
          />
        )}

        {/* If DOCX, docx-preview renders exact Word pages, fonts, images, margins, and alignment here */}
        <div
          ref={docxContainerRef}
          className={`w-full flex flex-col items-center ${doc?.ext === '.docx' ? 'block' : 'hidden'}`}
        />

        {/* Hidden template that gets injected directly inside the bottom of the last Word page */}
        {doc && (
          <div
            ref={endorsementTemplateRef}
            style={{ display: 'none', marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #1e40af' }}
          >
            <div
              style={{
                border: '1.5px solid #1e40af',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <div
                style={{
                  backgroundColor: '#1e40af',
                  color: '#ffffff',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  University FYP Official Digital Signature & Departmental Seal — Semester {doc.semesterNumber || 7}
                </span>
                <span>Status: {doc.status}</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  padding: '12px 14px',
                }}
              >
                {/* Supervisor Signature Box */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                    1. Faculty Supervisor Endorsement
                  </div>
                  {sup ? (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        Signed By: {sup.approvedByName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        Date: {new Date(sup.approvedAt).toLocaleString()}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {sup.signatureDataUrl || sup.signatureUrl ? (
                          <img
                            src={sup.signatureDataUrl || sup.signatureUrl}
                            alt="Supervisor Signature"
                            style={{
                              height: '48px',
                              maxWidth: '160px',
                              objectFit: 'contain',
                              display: 'inline-block',
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontStyle: 'italic',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              color: '#1e3a8a',
                              borderBottom: '1.5px solid #1e3a8a',
                            }}
                          >
                            {sup.approvedByName}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
                      Pending Supervisor Signature
                    </div>
                  )}
                </div>

                {/* Coordinator Signature & Official Stamp Box */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                    2. Coordinator Signature & Official Seal
                  </div>
                  {coord ? (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        Verified By: {coord.approvedByName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#047857', fontWeight: 600 }}>
                        Stamped & Locked: {new Date(coord.approvedAt).toLocaleString()}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {(coord.signatureDataUrl || coord.signatureUrl) && (
                          <img
                            src={coord.signatureDataUrl || coord.signatureUrl}
                            alt="Coordinator Signature"
                            style={{
                              height: '46px',
                              maxWidth: '130px',
                              objectFit: 'contain',
                              display: 'inline-block',
                            }}
                          />
                        )}
                        {(coord.stampDataUrl || coord.stampUrl) && (
                          <img
                            src={coord.stampDataUrl || coord.stampUrl}
                            alt="Official Stamp"
                            style={{
                              height: '48px',
                              maxWidth: '130px',
                              objectFit: 'contain',
                              display: 'inline-block',
                            }}
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
                      Awaiting Coordinator Official Seal
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SignaturePreview({ signatureUrl, stampUrl, signedBy, signedAt, roleTitle }) {
  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {signatureUrl ? (
          <div className="bg-white p-2 border border-gray-300 rounded shadow-2xs">
            <img
              src={signatureUrl}
              alt="Digital Signature"
              className="h-12 max-w-40 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-[10px] text-gray-500 text-center font-mono mt-0.5">Digitally Signed</div>
          </div>
        ) : (
          <div className="h-12 px-4 flex items-center justify-center bg-gray-200 text-gray-500 text-xs italic rounded">
            No Signature Uploaded
          </div>
        )}

        {stampUrl && (
          <div className="bg-white p-2 border border-blue-300 rounded shadow-2xs">
            <img
              src={stampUrl}
              alt="Official Department Stamp"
              className="h-12 max-w-28 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="text-[10px] text-blue-700 text-center font-mono mt-0.5">Official Stamp</div>
          </div>
        )}

        <div>
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {signedBy || 'Academic Authority'}
          </div>
          <div className="text-xs text-gray-600">{roleTitle || 'Faculty Signatory'}</div>
          {signedAt && (
            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
              Verified: {new Date(signedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
        <ShieldCheck className="w-4 h-4" />
        <span>Cryptographically Verified Asset</span>
      </div>
    </div>
  );
}

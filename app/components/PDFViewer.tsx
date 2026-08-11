'use client';

import React from 'react';

export default function PDFViewer({ src }: { src?: string }) {
  if (!src) return <div>Sem arquivo para exibir.</div>;

  return (
    <div className="w-full h-[800px]">
      <iframe src={src} className="w-full h-full" title="PDF Viewer" />
    </div>
  );
}

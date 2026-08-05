"use client";

import { useEffect, useRef, useState } from "react";

const PDFJS_WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";

export function PdfCanvasPreview({
  data,
  title,
}: {
  data: Uint8Array;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        const pdf = await pdfjs.getDocument({
          data: data.slice(),
        }).promise;
        if (cancelled) {
          return;
        }
        setPageCount(pdf.numPages);
        container.replaceChildren();

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) {
            return;
          }
          const viewport = page.getViewport({ scale: 1.35 });
          const outputScale = window.devicePixelRatio || 1;
          const canvas = document.createElement("canvas");
          canvas.dataset.page = String(pageNumber);
          canvas.setAttribute("aria-label", `${title} page ${pageNumber}`);
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "bg-white shadow-sm";
          container.appendChild(canvas);
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to create preview canvas");
          }
          await page.render({
            canvasContext: context,
            viewport,
            transform:
              outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          }).promise;
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Unable to render PDF preview",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [data, title]);

  if (error) {
    return <p className="p-6 text-sm text-[#334155]">{error}</p>;
  }

  return (
    <div className="h-full overflow-auto bg-[#F8FAFC] p-3">
      <div
        ref={containerRef}
        className="mx-auto flex max-w-3xl flex-col gap-3"
        data-page-count={pageCount || undefined}
      />
    </div>
  );
}

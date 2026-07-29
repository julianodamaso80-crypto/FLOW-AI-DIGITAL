"use client";

import { useState } from "react";

/**
 * Camada de mídia do Ato 8 (fechamento). Usa o retrato estático
 * (public/scenes/finale-portrait.png, via CSS .finale-portrait) como base e
 * poster; se o vídeo silencioso gerado no Higgsfield (seedance_2_0,
 * public/scenes/finale-video.mp4) estiver presente, ele entra por cima com
 * um leve movimento (respiração, piscar). Enquanto os arquivos não foram
 * baixados (ver baixar-assets.ps1), o vídeo falha ao carregar e o layout
 * cai de volta silenciosamente no retrato estático — sem quebrar a página.
 */
export default function FinaleMedia() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="finale-portrait" aria-hidden="true">
      {!videoFailed && (
        <video
          className="finale-portrait__video"
          src="/scenes/finale-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}

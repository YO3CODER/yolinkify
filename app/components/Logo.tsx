import { Cable } from "lucide-react";
import React from "react";

const Logo = () => {
  return (
    <div className="flex items-center gap-1">
      {/* Icône si tu veux garder */}
       <Cable className="w-6 h-6 text-primary" /> 

      {/* Image comme logo */}
      <img
        src="/YO.png"  // chemin de ton image dans le dossier public
        alt="Logo YO LINKIFY"
        className="w-40 h-40 object-contain animate-bounce" // taille et animation
      />

      {/* Optionnel : texte ou emoji */}
      <span className="text-2xl font-extrabold animate-pulse gap-1">🤩</span>
    </div>
  );
};

export default Logo;

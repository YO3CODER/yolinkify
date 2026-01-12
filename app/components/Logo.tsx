import React from "react";
import { Cable } from "lucide-react";

const Logo = () => {
  return (
    <div
      className="flex items-center  bg-transparent"
      data-theme="night">
        <div className=""> 
      <Cable className="w-6 h-6 text-primary mr-2" />
      </div> 
     <div className="text-2xl font-extrabold flex items-center gap-2">
  <span className="animate-pulse">🤩</span>

 <span className="flex gap-1 drop-shadow-lg font-extrabold text-2xl">
  <span className="text-pink-500 animate-up inline-block">A</span>
  <span className="text-purple-500 animate-down inline-block">m</span>
  <span className="text-blue-500 animate-up inline-block">i</span>
  <span className="text-teal-400 animate-down inline-block">r</span>
  <span className="text-orange-400 animate-up inline-block">a</span>
  <span className="text-rose-500 animate-down inline-block">h</span>
</span>


  <span className="animate-spin">🔥</span>
</div>

    </div>
  );
};

export default Logo;

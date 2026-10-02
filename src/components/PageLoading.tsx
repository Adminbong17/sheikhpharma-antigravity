import React from "react";

const PageLoading: React.FC = () => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 animate-in fade-in-50 duration-200">
      <div className="relative flex items-center justify-center">
        {/* Pulsing outer ring */}
        <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 animate-ping absolute" />
        {/* Spinning indicator */}
        <div className="h-10 w-10 rounded-full border-3 border-emerald-100 border-t-emerald-600 animate-spin" />
      </div>
      <span className="mt-3 text-xs font-semibold text-slate-500 tracking-wide">
        লোড হচ্ছে...
      </span>
    </div>
  );
};

export default PageLoading;

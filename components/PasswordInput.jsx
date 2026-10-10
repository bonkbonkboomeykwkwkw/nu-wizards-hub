"use client";

import { useState } from "react";

export default function PasswordInput({ className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} pr-16`}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-2 my-auto h-fit rounded px-2 py-1 text-xs font-semibold text-yellow-400 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

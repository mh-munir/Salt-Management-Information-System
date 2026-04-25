"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => mod.Toaster),
  { ssr: false }
);

export default function LazyToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 20000,
        style: {
          background: "#363636",
          color: "#fff",
        },
      }}
    />
  );
}

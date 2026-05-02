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
      gutter={14}
      containerStyle={{
        top: 20,
        left: 16,
        right: 16,
      }}
      toastOptions={{
        duration: 500,
        style: {
          background: "linear-gradient(135deg, #348CD4, #2F7FC0)",
          color: "#f8fafc",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: "18px",
          padding: "14px 16px",
          boxShadow: "0 18px 50px -22px rgba(47, 127, 192, 0.58), 0 10px 24px -18px rgba(15, 23, 42, 0.32)",
          backdropFilter: "blur(14px)",
          fontSize: "0.98rem",
          fontWeight: 600,
          maxWidth: "min(92vw, 30rem)",
        },
        success: {
          duration: 500,
          iconTheme: {
            primary: "#ffffff",
            secondary: "#348CD4",
          },
          style: {
            background: "linear-gradient(135deg, #348CD4, #2F7FC0)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
          },
        },
        error: {
          duration: 500,
          iconTheme: {
            primary: "#ffffff",
            secondary: "#348CD4",
          },
          style: {
            background: "linear-gradient(135deg, #348CD4, #2F7FC0)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
          },
        },
        loading: {
          duration: 500,
          iconTheme: {
            primary: "#ffffff",
            secondary: "#348CD4",
          },
        },
      }}
    />
  );
}

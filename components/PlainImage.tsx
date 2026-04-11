/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */

import type { ImgHTMLAttributes } from "react";

type PlainImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> & {
  alt: string;
};

// User-provided branding/avatar URLs can be remote, data URLs, or auth-protected,
// so we intentionally render a plain img instead of next/image here.
export default function PlainImage(props: PlainImageProps) {
  return <img {...props} />;
}

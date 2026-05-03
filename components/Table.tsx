import { memo, type ReactNode } from "react";

type TableRow = Record<string, ReactNode>;

type Props = {
  columns: string[];
  data: TableRow[];
};

export default export default function Table({ columns, data }: Props) {

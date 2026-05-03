import { memo, type ReactNode } from "react";

type TableRow = Record<string, ReactNode>;

type Props = {
  columns: string[];
  data: TableRow[];
};

export default function Table({ columns, data }: Props) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {columns.map((col) => (
              <td key={col}>{row[col]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

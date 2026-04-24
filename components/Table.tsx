import type { ReactNode } from "react";

type TableRow = Record<string, ReactNode>;

type Props = {
  columns: string[];
  data: TableRow[];
};

export default function Table({ columns, data }: Props) {
  return (
    <div className="overflow-x-auto rounded bg-white shadow">
      <table className="min-w-[36rem] w-full text-sm">
        <thead className="bg-[#003366] text-white">
          <tr>
            {columns.map((col) => (
              <th key={col} className="p-3 text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
              {columns.map((col) => (
                <td key={col} className="p-3">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

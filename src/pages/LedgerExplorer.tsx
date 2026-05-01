import React from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel
} from '@tanstack/react-table';
import { 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Calendar
} from 'lucide-react';
import { Card, Badge, HashDisplay, Button, PageLoader } from '../components/ui';
import { formatCurrency } from '../utils/utils';
import { format } from 'date-fns';
import { api, paiseStringToRupees, type BackendTransaction } from '../services/api';
import { useAuthStore } from '../store/authStore';

type TxRow = {
  blockNumber: number;
  hash: string;
  from: string;
  to: string;
  amount: number;
  department: string;
  timestamp: string;
  status: string;
};

const columnHelper = createColumnHelper<TxRow>();

const columns = [
  columnHelper.accessor('blockNumber', {
    header: 'Block',
    cell: info => <span className="text-text-muted font-mono">{info.getValue()}</span>,
  }),
  columnHelper.accessor('hash', {
    header: 'Tx Hash',
    cell: info => <HashDisplay value={info.getValue()} full={info.row.original.hash} />,
  }),
  columnHelper.accessor('from', {
    header: 'From',
    cell: info => <span className="font-medium text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('to', {
    header: 'To',
    cell: info => <span className="font-medium text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    cell: info => <span className="font-mono text-sm tracking-tighter">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor('department', {
    header: 'Dept',
    cell: info => <span className="text-xs text-text-secondary">{info.getValue().replace('Ministry of ', '')}</span>,
  }),
  columnHelper.accessor('timestamp', {
    header: 'Timestamp',
    cell: info => <span className="text-xs text-text-muted">{format(new Date(info.getValue()), 'dd MMM, HH:mm')}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => (
      <Badge variant={
        info.getValue() === 'confirmed' ? 'success' : 
        info.getValue() === 'flagged' ? 'danger' : 'warning'
      }>
        {info.getValue()}
      </Badge>
    ),
  }),
];

export default function LedgerExplorer() {
  const { accessToken } = useAuthStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [rows, setRows] = React.useState<TxRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accessToken) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await api.transactions(accessToken, "limit=100");
        const mapped = resp.data.map((t: BackendTransaction) => ({
          blockNumber: t.blockNumber ?? 0,
          hash: t.blockchainTxHash || t.id,
          from: t.fromName,
          to: t.toName,
          amount: paiseStringToRupees(t.amount),
          department: t.department?.name ?? "N/A",
          timestamp: t.createdAt,
          status: t.status.toLowerCase()
        }));
        setRows(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ledger");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [accessToken]);

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  if (loading) return <PageLoader label="Loading ledger..." />;
  if (error) return <div className="text-sm text-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Database className="text-accent" />
            Ledger Explorer
          </h1>
          <p className="text-text-secondary text-sm">Full audit trail of all transactions anchored on-chain.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="h-9">
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 bg-bg-surface/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search by hash, address, department..." 
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full bg-bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:border-accent outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-9 text-xs">
              <Filter size={14} />
              Filters
            </Button>
            <Button variant="secondary" className="h-9 text-xs">
              <Calendar size={14} />
              Date Range
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-border bg-bg-surface/50">
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-5 py-4 text-[11px] font-bold text-text-muted uppercase tracking-widest cursor-pointer hover:text-text-primary transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/50">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-bg-hover transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-5 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between bg-bg-surface/30">
          <div className="text-xs text-text-muted">
            Showing {table.getRowModel().rows.length} of {rows.length} transactions
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-xs font-medium px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button 
              variant="secondary" 
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

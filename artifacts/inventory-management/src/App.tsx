import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Archive,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  CirclePlus,
  ClipboardList,
  CreditCard,
  Banknote,
  LayoutDashboard,
  Menu,
  Minus,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  ShoppingCart,
  Smartphone,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getListMovementsQueryKey,
  getListProductsQueryKey,
  getListSalesQueryKey,
  useAdjustProductStock,
  useCreateSale,
  useCreateProduct,
  useDeleteProduct,
  useGetDashboardSummary,
  useListMovements,
  useListProducts,
  useListSales,
  useUpdateProduct,
  type InventoryMovement,
  type ListProductsParams,
  type Product,
  type ProductInput,
  type ProductUpdate,
  type Sale,
  type SaleInput,
  type SaleSummary,
  type StockAdjustmentInput,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const moneyPrecise = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = new Intl.NumberFormat('en-US');
const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const currentTime = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

function formatDate(value: string, compact = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', compact
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value, true);
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/.24)]">
      <Boxes size={19} strokeWidth={2.5} />
      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-[hsl(var(--chart-4))]" />
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/pos', label: 'Point of sale', icon: ShoppingCart },
    { href: '/products', label: 'Products', icon: ClipboardList },
    { href: '/movements', label: 'Movements', icon: RefreshCw },
  ];
  return (
    <>
      {open && <button aria-label="Close navigation" data-testid="button-close-navigation" onClick={onClose} className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.32)] md:hidden" />}
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-[266px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center gap-3 px-2">
          <LogoMark />
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--sidebar-foreground)/.55)]">Operations</p>
            <p className="text-[17px] font-bold tracking-[-.03em]">Stockroom</p>
          </div>
          <button type="button" onClick={onClose} data-testid="button-mobile-close" className="ml-auto rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden">
            <X size={17} />
          </button>
        </div>

        <div className="mt-10 px-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-foreground/40">Workspace</p>
          <nav className="mt-3 space-y-1" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  data-testid={`link-${item.label.toLowerCase()}`}
                  className={cx(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors',
                    active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                  <span>{item.label}</span>
                  {item.href === '/products' && <span className="ml-auto rounded-full bg-sidebar-foreground/10 px-2 py-0.5 font-mono text-[10px] text-sidebar-foreground/55">CATALOG</span>}
                  {item.href === '/pos' && <span className="ml-auto rounded-full bg-[hsl(var(--sidebar-primary)/.2)] px-2 py-0.5 font-mono text-[10px] text-[hsl(var(--sidebar-primary))]">SELL</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto">
          <div className="mx-2 mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/65 p-3.5">
            <div className="flex items-center gap-2 text-[hsl(var(--chart-4))]">
              <Sparkles size={15} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">Daily check</span>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-sidebar-foreground/65">Keep your shelf count close to the truth.</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sidebar-foreground/10">
              <div className="h-full w-[72%] rounded-full bg-[hsl(var(--sidebar-primary))]" />
            </div>
            <p className="mt-2 font-mono text-[10px] text-sidebar-foreground/45">72% of today reviewed</p>
          </div>
          <div className="flex items-center gap-3 border-t border-sidebar-border px-2 pt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--sidebar-primary)/.18)] font-mono text-[11px] font-bold text-[hsl(var(--sidebar-primary))]">MO</div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold">Mara Ortiz</p>
              <p className="truncate text-[11px] text-sidebar-foreground/45">Operations lead</p>
            </div>
            <button type="button" data-testid="button-account-menu" className="ml-auto rounded-md p-1 text-sidebar-foreground/45 hover:text-sidebar-foreground"><MoreHorizontal size={17} /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const [location] = useLocation();
  const title = location === '/' ? 'Overview' : location === '/pos' ? 'Point of sale' : location === '/products' ? 'Products' : 'Movements';
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenu} data-testid="button-open-navigation" className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"><Menu size={20} /></button>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Stockroom / {title}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-foreground/85">{location === '/' ? 'A clear read on your operation' : location === '/pos' ? 'Move product from shelf to customer' : location === '/products' ? 'Every item, one source of truth' : 'A traceable record of change'}</p>
        </div>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))] shadow-[0_0_0_3px_hsl(var(--chart-2)/.15)]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Live data</span>
        </div>
        <button type="button" data-testid="button-header-help" className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">Need a hand?</button>
      </div>
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="flex min-h-[100dvh]">
        <Sidebar open={mobileNav} onClose={() => setMobileNav(false)} />
        <div className="min-w-0 flex-1">
          <Header onMenu={() => setMobileNav(true)} />
          <main className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 md:py-9">{children}</main>
        </div>
      </div>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.23em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-[30px] font-bold tracking-[-.055em] text-foreground md:text-[38px]">{title}</h1>
        <p className="mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-muted', className)} />;
}

function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Skeleton className="h-4 w-28" />
      <div className="mt-5 space-y-4">{Array.from({ length: rows }).map((_, index) => <div className="flex items-center gap-3" key={index}><Skeleton className="h-8 w-8 rounded-xl" /><Skeleton className="h-3 flex-1" /><Skeleton className="h-3 w-20" /></div>)}</div>
    </div>
  );
}

function ErrorPanel({ onRetry, title = 'Could not load this view' }: { onRetry: () => void; title?: string }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--destructive)/.22)] bg-[hsl(var(--destructive)/.05)] p-7 text-center">
      <CircleAlert className="mx-auto text-destructive" size={24} />
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">The signal dropped before we got a complete read.</p>
      <button type="button" onClick={onRetry} data-testid="button-retry-load" className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold transition-colors hover:border-primary/50">Try again</button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const settings: Record<string, { label: string; className: string }> = {
    healthy: { label: 'Healthy', className: 'bg-[hsl(var(--chart-2)/.12)] text-[hsl(var(--chart-2))]' },
    low_stock: { label: 'Low stock', className: 'bg-[hsl(var(--chart-4)/.18)] text-[hsl(33_55%_34%)]' },
    out_of_stock: { label: 'Out of stock', className: 'bg-[hsl(var(--destructive)/.11)] text-destructive' },
  };
  const item = settings[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return <span data-testid={`status-${status}`} className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.05em]', item.className)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{item.label}</span>;
}

function MovementBadge({ type }: { type: string }) {
  const config = {
    in: { label: 'Inbound', icon: ArrowDownLeft, className: 'bg-[hsl(var(--chart-2)/.11)] text-[hsl(var(--chart-2))]' },
    out: { label: 'Outbound', icon: ArrowUpRight, className: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' },
    adjustment: { label: 'Adjustment', icon: SlidersHorizontal, className: 'bg-[hsl(var(--chart-3)/.12)] text-[hsl(var(--chart-3))]' },
  }[type] ?? { label: type, icon: RefreshCw, className: 'bg-muted text-muted-foreground' };
  const Icon = config.icon;
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.04em]', config.className)}><Icon size={12} />{config.label}</span>;
}

function StatCard({ label, value, detail, icon: Icon, tone = 'default' }: { label: string; value: string; detail: string; icon: typeof Boxes; tone?: 'default' | 'alert' | 'teal' }) {
  const toneClass = tone === 'alert' ? 'text-destructive bg-[hsl(var(--destructive)/.1)]' : tone === 'teal' ? 'text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2)/.11)]' : 'text-primary bg-[hsl(var(--primary)/.1)]';
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_18px_hsl(var(--foreground)/.025)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</p>
        <div className={cx('flex h-8 w-8 items-center justify-center rounded-xl', toneClass)}><Icon size={16} /></div>
      </div>
      <p className="mt-5 text-[28px] font-bold tracking-[-.055em]">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function DashboardPage() {
  const summaryQuery = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const movementsQuery = useListMovements({ limit: 6 }, { query: { queryKey: getListMovementsQueryKey({ limit: 6 }) } });
  const summary = summaryQuery.data;
  return (
    <div className="animate-[fade-up_.45s_ease-out_both]">
      <PageIntro
        eyebrow={`${todayLabel} · ${currentTime}`}
        title="Good morning, Mara."
        description="Here is the current shape of your stockroom. Resolve the small signals before they become expensive ones."
        action={<Link href="/products" data-testid="link-dashboard-products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground shadow-[0_7px_16px_hsl(var(--primary)/.2)] transition-transform hover:-translate-y-0.5"><PackageCheck size={16} />Review catalog</Link>}
      />

      {summaryQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[142px] rounded-2xl" />)}</div>
      ) : summaryQuery.isError || !summary ? <ErrorPanel onRetry={() => summaryQuery.refetch()} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Products tracked" value={number.format(summary.totalProducts)} detail="Across your active catalog" icon={ClipboardList} />
          <StatCard label="Units on hand" value={number.format(summary.totalUnits)} detail="Physical count, all locations" icon={Boxes} tone="teal" />
          <StatCard label="Inventory value" value={money.format(summary.inventoryValue)} detail="At current unit cost" icon={TrendingUp} />
          <StatCard label="Low stock" value={number.format(summary.lowStockCount)} detail="Need a replenishment decision" icon={CircleAlert} tone="alert" />
          <StatCard label="Out of stock" value={number.format(summary.outOfStockCount)} detail="Currently unavailable to ship" icon={Archive} tone="alert" />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <MovementChart trend={summary?.movementTrend ?? []} loading={summaryQuery.isLoading} />
        <RecentMovements query={movementsQuery} />
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--chart-2)/.12)] text-[hsl(var(--chart-2))]"><Check size={15} /></div>
        <div><p className="text-[13px] font-bold">Count with confidence.</p><p className="text-[12px] text-muted-foreground">Every change is timestamped and attached to a product record.</p></div>
        <Link href="/movements" data-testid="link-dashboard-movements" className="ml-auto hidden text-[12px] font-bold text-primary hover:underline sm:block">View movement log →</Link>
      </div>
    </div>
  );
}

function MovementChart({ trend, loading }: { trend: Array<{ date: string; inbound: number; outbound: number }>; loading: boolean }) {
  const max = Math.max(...trend.flatMap((item) => [item.inbound, item.outbound]), 1);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between">
        <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.17em] text-muted-foreground">Movement pulse</p><h2 className="mt-1 text-[17px] font-bold tracking-[-.02em]">Stock flow, last 7 days</h2></div>
        <div className="flex gap-3 pt-1 font-mono text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />In</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" />Out</span></div>
      </div>
      {loading ? <Skeleton className="mt-7 h-[225px] w-full" /> : trend.length === 0 ? <div className="flex h-[225px] items-center justify-center text-center"><div><TrendingUp className="mx-auto text-muted-foreground/40" size={27} /><p className="mt-3 text-sm font-bold">No movement yet</p><p className="mt-1 text-xs text-muted-foreground">Inbound and outbound activity will appear here.</p></div></div> : (
        <div className="mt-7 flex h-[225px] items-end gap-2 border-b border-border/80 pb-0 sm:gap-3">
          {trend.map((item) => {
            const inboundHeight = Math.max(3, (item.inbound / max) * 170);
            const outboundHeight = Math.max(3, (item.outbound / max) * 170);
            return <div key={item.date} data-testid={`chart-day-${item.date}`} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-[175px] items-end gap-1">
                <div title={`${item.inbound} inbound`} style={{ height: `${inboundHeight}px` }} className="w-2.5 rounded-t-md bg-[hsl(var(--chart-2))] transition-opacity group-hover:opacity-70 sm:w-3" />
                <div title={`${item.outbound} outbound`} style={{ height: `${outboundHeight}px` }} className="w-2.5 rounded-t-md bg-primary transition-opacity group-hover:opacity-70 sm:w-3" />
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">{formatDate(item.date, true).replace(' ', ' ')}</span>
            </div>;
          })}
        </div>
      )}
    </section>
  );
}

type MovementQueryLike = {
  data?: InventoryMovement[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

function RecentMovements({ query }: { query: MovementQueryLike }) {
  const movements = query.data ?? [];
  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.17em] text-muted-foreground">Recent activity</p><h2 className="mt-1 text-[17px] font-bold tracking-[-.02em]">What just changed</h2></div><Link href="/movements" data-testid="link-recent-movements" className="text-[11px] font-bold text-primary hover:underline">See all</Link></div>
      {query.isLoading ? <div className="mt-6"><LoadingPanel rows={5} /></div> : query.isError ? <div className="mt-5"><ErrorPanel onRetry={() => query.refetch()} title="Activity is taking a moment" /></div> : movements.length === 0 ? <EmptyState icon={RefreshCw} title="Quiet shelf" description="New stock movement will land here." compact /> : (
        <div className="mt-5 divide-y divide-border/70">
          {movements.slice(0, 5).map((movement) => <MovementRow key={movement.id} movement={movement} />)}
        </div>
      )}
    </section>
  );
}

function MovementRow({ movement }: { movement: InventoryMovement }) {
  return (
    <div data-testid={`row-movement-${movement.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', movement.type === 'in' ? 'bg-[hsl(var(--chart-2)/.11)] text-[hsl(var(--chart-2))]' : movement.type === 'out' ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--chart-3)/.12)] text-[hsl(var(--chart-3))]')}>
        {movement.type === 'in' ? <ArrowDownLeft size={15} /> : movement.type === 'out' ? <ArrowUpRight size={15} /> : <SlidersHorizontal size={15} />}
      </div>
      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{movement.productName}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{movement.note || (movement.type === 'in' ? 'Received into stock' : movement.type === 'out' ? 'Removed from stock' : 'Count correction')}</p></div>
      <div className="text-right"><p className={cx('font-mono text-[12px] font-bold', movement.type === 'in' ? 'text-[hsl(var(--chart-2))]' : movement.type === 'out' ? 'text-primary' : 'text-muted-foreground')}>{movement.type === 'in' ? '+' : movement.type === 'out' ? '−' : '±'}{number.format(movement.quantity)}</p><p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{formatRelative(movement.createdAt)}</p></div>
    </div>
  );
}

type CartLine = { product: Product; quantity: number };

function POSPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<SaleInput['paymentMethod']>('cash');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const productsParams = useMemo<ListProductsParams>(() => ({ search: search.trim() || undefined }), [search]);
  const productsQuery = useListProducts(productsParams, { query: { queryKey: getListProductsQueryKey(productsParams) } });
  const salesQuery = useListSales({ limit: 8 }, { query: { queryKey: getListSalesQueryKey({ limit: 8 }) } });
  const createSale = useCreateSale();
  const queryClient = useQueryClient();
  const products = productsQuery.data ?? [];
  const subtotal = cart.reduce((total, line) => total + line.product.unitPrice * line.quantity, 0);

  const invalidateAfterSale = () => {
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListMovementsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
  };

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (!existing) return [...current, { product, quantity: 1 }];
      if (existing.quantity >= product.stockOnHand) return current;
      return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
    });
  };

  const changeQuantity = (productId: number, quantity: number) => {
    setCart((current) => current
      .map((line) => line.product.id === productId ? { ...line, quantity: Math.min(line.product.stockOnHand, quantity) } : line)
      .filter((line) => line.quantity > 0));
  };

  const submitSale = () => {
    if (!cart.length) return;
    createSale.mutate({
      data: {
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        paymentMethod,
      },
    }, {
      onSuccess: (sale) => {
        invalidateAfterSale();
        setCart([]);
        setCompletedSale(sale);
      },
    });
  };

  return (
    <div className="animate-[fade-up_.45s_ease-out_both]">
      <PageIntro
        eyebrow="Point of sale / 04"
        title="Make a sale."
        description="Turn a shelf pick into a recorded checkout without losing the inventory trail."
        action={<Link href="/products" data-testid="link-pos-products" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-bold transition-colors hover:border-primary/50"><ClipboardList size={16} />Manage catalog</Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-pos-search" placeholder="Search products by name or SKU" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-[13px] outline-none ring-offset-background transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </div>
            <span className="whitespace-nowrap px-2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{products.length} available</span>
          </div>

          {productsQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[156px] rounded-2xl" />)}</div> : productsQuery.isError ? <ErrorPanel onRetry={() => productsQuery.refetch()} title="Products are taking a moment" /> : products.length === 0 ? <EmptyState icon={ShoppingCart} title="No sellable products found" description="Try a different search or add stock to a product before selling it." action={<Link href="/products" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Open catalog</Link>} /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const inCart = cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
                const unavailable = product.stockOnHand === 0 || inCart >= product.stockOnHand;
                return (
                  <div key={product.id} data-testid={`card-pos-product-${product.id}`} className={cx('rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_25px_hsl(var(--foreground)/.06)]', unavailable && 'opacity-65')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] font-mono text-[11px] font-bold text-primary">{product.name.slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0"><p className="truncate text-[13px] font-bold">{product.name}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{product.sku}</p></div>
                      </div>
                      <p className="shrink-0 font-mono text-[13px] font-bold">{moneyPrecise.format(product.unitPrice)}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className={cx('font-mono text-[10px] font-bold uppercase tracking-[.08em]', product.stockOnHand <= product.reorderPoint ? 'text-[hsl(var(--chart-4))]' : 'text-muted-foreground')}>{number.format(product.stockOnHand)} on hand</p>
                      <button type="button" onClick={() => addToCart(product)} disabled={unavailable} data-testid={`button-pos-add-${product.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"><Plus size={14} />{inCart ? `${inCart} in cart` : 'Add'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[0_6px_25px_hsl(var(--foreground)/.035)] xl:sticky xl:top-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Current order</p><h2 className="mt-1 text-[19px] font-bold tracking-[-.035em]">{cart.length ? `${cart.length} ${cart.length === 1 ? 'item' : 'items'}` : 'Ready for a customer'}</h2></div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-primary"><ShoppingCart size={17} /></div>
          </div>
          {cart.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><ReceiptText size={21} /></div><p className="mt-4 text-sm font-bold">Your cart is empty</p><p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">Choose an available product to start a new checkout.</p></div> : (
            <>
              <div className="max-h-[310px] divide-y divide-border/70 overflow-y-auto">
                {cart.map((line) => <div key={line.product.id} className="flex items-center gap-3 py-3 first:pt-4 last:pb-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-[10px] font-bold text-primary">{line.product.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{line.product.name}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{moneyPrecise.format(line.product.unitPrice)} each</p></div>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5"><button type="button" onClick={() => changeQuantity(line.product.id, line.quantity - 1)} data-testid={`button-pos-minus-${line.product.id}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Minus size={13} /></button><span className="w-5 text-center font-mono text-[11px] font-bold">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.product.id, line.quantity + 1)} disabled={line.quantity >= line.product.stockOnHand} data-testid={`button-pos-plus-${line.product.id}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"><Plus size={13} /></button></div>
                  <p className="w-16 text-right font-mono text-[12px] font-bold">{moneyPrecise.format(line.product.unitPrice * line.quantity)}</p>
                </div>)}
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground"><span>Subtotal</span><span className="font-mono font-bold text-foreground">{moneyPrecise.format(subtotal)}</span></div>
                <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground"><span>Tax</span><span className="font-mono font-bold text-foreground">Included</span></div>
                <div className="mt-4 flex items-end justify-between"><span className="text-[13px] font-bold">Total</span><span className="font-mono text-[24px] font-bold tracking-[-.05em]">{moneyPrecise.format(subtotal)}</span></div>
              </div>
              <div className="mt-5">
                <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {([['cash', Banknote, 'Cash'], ['card', CreditCard, 'Card'], ['upi', Smartphone, 'UPI']] as const).map(([method, Icon, label]) => <button type="button" key={method} onClick={() => setPaymentMethod(method)} data-testid={`button-payment-${method}`} className={cx('flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[10px] font-bold transition-colors', paymentMethod === method ? 'border-primary bg-[hsl(var(--primary)/.1)] text-primary' : 'border-border text-muted-foreground hover:bg-muted') }><Icon size={16} />{label}</button>)}
                </div>
              </div>
              {createSale.error && <p className="mt-4 rounded-xl bg-[hsl(var(--destructive)/.08)] px-3 py-2.5 text-xs leading-5 text-destructive">Checkout could not be completed. Stock may have changed; refresh and try again.</p>}
              <button type="button" onClick={submitSale} disabled={createSale.isPending} data-testid="button-complete-sale" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-primary-foreground shadow-[0_7px_16px_hsl(var(--primary)/.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{createSale.isPending ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}Complete sale</button>
            </>
          )}
        </section>
      </div>

      {completedSale && <SaleReceipt sale={completedSale} onClose={() => setCompletedSale(null)} />}
      <SalesHistory query={salesQuery} />
    </div>
  );
}

function SaleReceipt({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return <Modal title="Sale complete" description={`${sale.saleNumber} · ${formatDate(sale.createdAt)}`} onClose={onClose}>
    <div className="rounded-2xl bg-[hsl(var(--chart-2)/.1)] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--chart-2)/.18)] text-[hsl(var(--chart-2))]"><Check size={17} /></div><div><p className="text-[13px] font-bold">Inventory updated successfully.</p><p className="mt-0.5 text-[11px] text-muted-foreground">The sale is recorded and the stock trail is up to date.</p></div></div></div>
    <div className="mt-5 divide-y divide-border/70">{sale.items.map((item) => <div key={`${item.productId}-${item.sku}`} className="flex items-center justify-between py-3 first:pt-0"><div><p className="text-[12px] font-bold">{item.productName}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{item.quantity} × {moneyPrecise.format(item.unitPrice)}</p></div><p className="font-mono text-[12px] font-bold">{moneyPrecise.format(item.lineTotal)}</p></div>)}</div>
    <div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span className="text-[13px] font-bold">Total paid</span><span className="font-mono text-[19px] font-bold">{moneyPrecise.format(sale.total)}</span></div>
    <button type="button" onClick={onClose} data-testid="button-close-receipt" className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Start another sale</button>
  </Modal>;
}

type SaleQueryLike = { data?: SaleSummary[]; isLoading: boolean; isError: boolean; refetch: () => unknown };

function SalesHistory({ query }: { query: SaleQueryLike }) {
  const sales = query.data ?? [];
  return <section className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
    <div className="flex items-start justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.17em] text-muted-foreground">Sales history</p><h2 className="mt-1 text-[17px] font-bold tracking-[-.02em]">Recent checkouts</h2></div><span className="font-mono text-[10px] text-muted-foreground">Newest first</span></div>
    {query.isLoading ? <div className="mt-5"><LoadingPanel rows={3} /></div> : query.isError ? <div className="mt-5"><ErrorPanel onRetry={() => query.refetch()} title="Sales history is taking a moment" /></div> : sales.length === 0 ? <div className="py-8 text-center text-xs text-muted-foreground">Completed sales will appear here.</div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-border bg-muted/35 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground"><th className="px-4 py-3 font-bold">Sale</th><th className="px-4 py-3 font-bold">Items</th><th className="px-4 py-3 font-bold">Payment</th><th className="px-4 py-3 font-bold">Total</th><th className="px-4 py-3 font-bold">Recorded</th></tr></thead><tbody className="divide-y divide-border/70">{sales.map((sale) => <tr key={sale.id} data-testid={`row-sale-${sale.id}`} className="transition-colors hover:bg-muted/25"><td className="px-4 py-3 font-mono text-[11px] font-bold">{sale.saleNumber}</td><td className="px-4 py-3 text-[12px] text-muted-foreground">{sale.itemCount}</td><td className="px-4 py-3 text-[11px] font-bold capitalize">{sale.paymentMethod}</td><td className="px-4 py-3 font-mono text-[12px] font-bold">{moneyPrecise.format(sale.total)}</td><td className="px-4 py-3 text-[11px] text-muted-foreground">{formatRelative(sale.createdAt)}</td></tr>)}</tbody></table></div>}
  </section>;
}

function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListProductsParams['status']>('all');
  const [category, setCategory] = useState('all');
  const [modal, setModal] = useState<'create' | Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const params = useMemo<ListProductsParams>(() => ({ search: search || undefined, status: status === 'all' ? undefined : status, category: category === 'all' ? undefined : category }), [search, status, category]);
  const query = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  const products = query.data ?? [];
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListMovementsQueryKey() });
  };
  const submitProduct = (data: ProductInput | ProductUpdate, editing: boolean, id?: number) => {
    if (editing && id) {
      updateProduct.mutate({ id, data }, { onSuccess: () => { invalidateInventory(); setModal(null); } });
    } else {
      createProduct.mutate({ data: data as ProductInput }, { onSuccess: () => { invalidateInventory(); setModal(null); } });
    }
  };
  const isMutating = createProduct.isPending || updateProduct.isPending;
  return (
    <div className="animate-[fade-up_.45s_ease-out_both]">
      <PageIntro eyebrow="Catalog / 03" title="Product catalog" description="Search the shelf, spot risk, and keep the record useful for the next person." action={<button type="button" onClick={() => setModal('create')} data-testid="button-add-product" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground shadow-[0_7px_16px_hsl(var(--primary)/.2)] transition-transform hover:-translate-y-0.5"><Plus size={16} />Add product</button>} />
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-search-products" placeholder="Search name or SKU" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-[13px] outline-none ring-offset-background transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15" />
        </div>
        <div className="flex gap-2">
          <select value={status} onChange={(event) => setStatus(event.target.value as ListProductsParams['status'])} data-testid="select-product-status" className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-[12px] font-semibold outline-none focus:border-primary md:w-36 md:flex-none">
            <option value="all">All status</option><option value="healthy">Healthy</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} data-testid="select-product-category" className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-[12px] font-semibold outline-none focus:border-primary md:w-36 md:flex-none">
            <option value="all">All categories</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </div>
      </div>
      {query.isLoading ? <LoadingPanel rows={6} /> : query.isError ? <ErrorPanel onRetry={() => query.refetch()} /> : products.length === 0 ? <EmptyState icon={PackageCheck} title={search || status !== 'all' || category !== 'all' ? 'No products match that view' : 'Your catalog is ready for its first item'} description={search || status !== 'all' || category !== 'all' ? 'Try a different search or clear the filters.' : 'Add your first product to start tracking what is on the shelf.'} action={<button type="button" onClick={() => setModal('create')} data-testid="button-empty-add-product" className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">{search || status !== 'all' || category !== 'all' ? 'Add anyway' : 'Add first product'}</button>} /> : (
        <ProductTable products={products} onEdit={(product) => setModal(product)} onDelete={setDeleteTarget} onAdjust={setAdjustTarget} />
      )}
      {modal && <ProductFormModal product={modal === 'create' ? null : modal} pending={isMutating} error={createProduct.error || updateProduct.error} onClose={() => setModal(null)} onSubmit={(data) => submitProduct(data, modal !== 'create', modal === 'create' ? undefined : modal.id)} />}
      {deleteTarget && <ConfirmModal title={`Delete ${deleteTarget.name}?`} description="This removes the product from your catalog. Its movement history will remain recorded." pending={deleteProduct.isPending} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteProduct.mutate({ id: deleteTarget.id }, { onSuccess: () => { invalidateInventory(); setDeleteTarget(null); } })} />}
      {adjustTarget && <StockAdjustmentModal product={adjustTarget} onClose={() => setAdjustTarget(null)} />}
    </div>
  );
}

function ProductTable({ products, onEdit, onDelete, onAdjust }: { products: Product[]; onEdit: (product: Product) => void; onDelete: (product: Product) => void; onAdjust: (product: Product) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{products.length} {products.length === 1 ? 'product' : 'products'} in view</p><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" />Live catalog</div></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead><tr className="border-b border-border bg-muted/35 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground"><th className="px-5 py-3 font-bold">Product</th><th className="px-4 py-3 font-bold">Category</th><th className="px-4 py-3 font-bold">On hand</th><th className="px-4 py-3 font-bold">Unit price</th><th className="px-4 py-3 font-bold">Stock value</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Updated</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-border/70">
            {products.map((product) => <tr key={product.id} data-testid={`row-product-${product.id}`} className="group transition-colors hover:bg-muted/25">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] font-mono text-[11px] font-bold text-primary">{product.name.slice(0, 2).toUpperCase()}</div><div><p data-testid={`text-product-name-${product.id}`} className="text-[13px] font-bold">{product.name}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.sku}</p></div></div></td>
              <td className="px-4 py-4 text-[12px] text-muted-foreground">{product.category}</td>
              <td className="px-4 py-4"><p className="font-mono text-[12px] font-bold">{number.format(product.stockOnHand)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">reorder at {number.format(product.reorderPoint)}</p></td>
              <td className="px-4 py-4 font-mono text-[12px]">{moneyPrecise.format(product.unitPrice)}</td>
              <td className="px-4 py-4 font-mono text-[12px] font-bold">{money.format(product.stockValue)}</td>
              <td className="px-4 py-4"><StatusBadge status={product.status} /></td>
              <td className="px-4 py-4 font-mono text-[10px] text-muted-foreground">{formatDate(product.updatedAt, true)}</td>
              <td className="px-4 py-4"><div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100"><button type="button" onClick={() => onAdjust(product)} data-testid={`button-adjust-product-${product.id}`} title="Adjust stock" className="rounded-lg p-2 text-muted-foreground hover:bg-[hsl(var(--chart-2)/.12)] hover:text-[hsl(var(--chart-2))]"><SlidersHorizontal size={15} /></button><button type="button" onClick={() => onEdit(product)} data-testid={`button-edit-product-${product.id}`} title="Edit product" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={15} /></button><button type="button" onClick={() => onDelete(product)} data-testid={`button-delete-product-${product.id}`} title="Delete product" className="rounded-lg p-2 text-muted-foreground hover:bg-[hsl(var(--destructive)/.1)] hover:text-destructive"><Trash2 size={15} /></button></div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ProductDraft = { sku: string; name: string; category: string; unitPrice: string; stockOnHand: string; reorderPoint: string };

function ProductFormModal({ product, pending, error, onClose, onSubmit }: { product: Product | null; pending: boolean; error: unknown; onClose: () => void; onSubmit: (data: ProductInput | ProductUpdate) => void }) {
  const [form, setForm] = useState<ProductDraft>(product ? { sku: product.sku, name: product.name, category: product.category, unitPrice: String(product.unitPrice), stockOnHand: String(product.stockOnHand), reorderPoint: String(product.reorderPoint) } : { sku: '', name: '', category: '', unitPrice: '', stockOnHand: '', reorderPoint: '' });
  const editing = Boolean(product);
  const update = (key: keyof ProductDraft) => (event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const common = { sku: form.sku.trim(), name: form.name.trim(), category: form.category.trim(), unitPrice: Number(form.unitPrice), reorderPoint: Number(form.reorderPoint) };
    onSubmit(editing ? common : { ...common, stockOnHand: Number(form.stockOnHand) });
  };
  return (
    <Modal title={editing ? 'Edit product' : 'Add product'} description={editing ? 'Update the details people use to identify and replenish this item.' : 'Give the team a clean record to work from.'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Product name" value={form.name} onChange={update('name')} placeholder="e.g. 12 oz shipping carton" required testId="input-product-name" /><Field label="SKU" value={form.sku} onChange={update('sku')} placeholder="e.g. BOX-12-OZ" required testId="input-product-sku" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Category" value={form.category} onChange={update('category')} placeholder="Packaging" required testId="input-product-category" /><Field label="Unit price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={update('unitPrice')} placeholder="0.00" required testId="input-product-price" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Stock on hand" type="number" min="0" value={form.stockOnHand} onChange={update('stockOnHand')} placeholder="0" required={!editing} disabled={editing} testId="input-product-stock" /><Field label="Reorder point" type="number" min="0" value={form.reorderPoint} onChange={update('reorderPoint')} placeholder="0" required testId="input-product-reorder" /></div>
        {editing && <p className="rounded-xl bg-muted px-3 py-2 text-[11px] leading-5 text-muted-foreground">Stock on hand is changed through an adjustment so every count change has a reason.</p>}
        {Boolean(error) && <p className="rounded-xl bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs text-destructive">We could not save that product. Check the fields and try again.</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} data-testid="button-cancel-product" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button><button type="submit" disabled={pending} data-testid="button-save-product" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{pending && <RefreshCw size={14} className="animate-spin" />}{editing ? 'Save changes' : 'Create product'}</button></div>
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', min, step, required, disabled, testId }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; min?: string; step?: string; required?: boolean; disabled?: boolean; testId: string }) {
  return <label className="block"><span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</span><input type={type} min={min} step={step} value={value} onChange={onChange} placeholder={placeholder} required={required} disabled={disabled} data-testid={testId} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground" /></label>;
}

function MovementsPage() {
  const [limit, setLimit] = useState(50);
  const [typeFilter, setTypeFilter] = useState('all');
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const movementsQuery = useListMovements({ limit }, { query: { queryKey: getListMovementsQueryKey({ limit }) } });
  const productsQuery = useListProducts(undefined, { query: { queryKey: getListProductsQueryKey() } });
  const movements = (movementsQuery.data ?? []).filter((movement) => typeFilter === 'all' || movement.type === typeFilter);
  return (
    <div className="animate-[fade-up_.45s_ease-out_both]">
      <PageIntro eyebrow="Audit trail / 02" title="Movement log" description="A readable record of every unit entering, leaving, or being corrected in the stockroom." action={<button type="button" onClick={() => setAdjustTarget(productsQuery.data?.[0] ?? null)} disabled={!productsQuery.data?.length} data-testid="button-new-adjustment" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground shadow-[0_7px_16px_hsl(var(--primary)/.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"><CirclePlus size={16} />New adjustment</button>} />
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">{['all', 'in', 'out', 'adjustment'].map((type) => <button type="button" key={type} onClick={() => setTypeFilter(type)} data-testid={`button-filter-movement-${type}`} className={cx('rounded-lg px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[.08em] transition-colors', typeFilter === type ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{type === 'all' ? 'All activity' : type === 'in' ? 'Inbound' : type === 'out' ? 'Outbound' : 'Adjustments'}</button>)}</div>
        <div className="flex items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">Showing</span><select value={limit} onChange={(event) => setLimit(Number(event.target.value))} data-testid="select-movement-limit" className="h-8 rounded-lg border border-input bg-background px-2 text-[11px] font-semibold outline-none"><option value={25}>25 entries</option><option value={50}>50 entries</option><option value={100}>100 entries</option></select></div>
      </div>
      {movementsQuery.isLoading ? <LoadingPanel rows={7} /> : movementsQuery.isError ? <ErrorPanel onRetry={() => movementsQuery.refetch()} /> : movements.length === 0 ? <EmptyState icon={RefreshCw} title={typeFilter === 'all' ? 'No movement recorded yet' : `No ${typeFilter} activity`} description="Stock changes will appear here with their quantity, note, and timestamp." action={<button type="button" onClick={() => setAdjustTarget(productsQuery.data?.[0] ?? null)} disabled={!productsQuery.data?.length} data-testid="button-empty-new-adjustment" className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">Record movement</button>} /> : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{movements.length} recorded changes</p><span className="font-mono text-[10px] text-muted-foreground">Newest first</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-border bg-muted/35 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground"><th className="px-5 py-3 font-bold">Change</th><th className="px-4 py-3 font-bold">Product</th><th className="px-4 py-3 font-bold">Quantity</th><th className="px-4 py-3 font-bold">Note</th><th className="px-4 py-3 font-bold">Recorded</th></tr></thead><tbody className="divide-y divide-border/70">{movements.map((movement) => <tr key={movement.id} data-testid={`row-history-${movement.id}`} className="transition-colors hover:bg-muted/25"><td className="px-5 py-4"><MovementBadge type={movement.type} /></td><td className="px-4 py-4"><p className="text-[13px] font-bold">{movement.productName}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">Product #{movement.productId}</p></td><td className="px-4 py-4 font-mono text-[13px] font-bold">{movement.type === 'in' ? '+' : movement.type === 'out' ? '−' : '±'}{number.format(movement.quantity)}</td><td className="max-w-[260px] px-4 py-4 text-[12px] text-muted-foreground">{movement.note || 'No note added'}</td><td className="px-4 py-4"><p className="text-[12px] font-semibold">{formatDate(movement.createdAt)}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{formatRelative(movement.createdAt)}</p></td></tr>)}</tbody></table></div>
        </div>
      )}
      {adjustTarget && <StockAdjustmentModal product={adjustTarget} onClose={() => setAdjustTarget(null)} />}
    </div>
  );
}

function StockAdjustmentModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [type, setType] = useState<StockAdjustmentInput['type']>('in');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const adjust = useAdjustProductStock();
  const queryClient = useQueryClient();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    adjust.mutate({ id: product.id, data: { type, quantity: Number(quantity), note: note.trim() || null } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListMovementsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); onClose(); } });
  };
  return (
    <Modal title="Adjust stock" description={`${product.name} · ${number.format(product.stockOnHand)} units currently on hand`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div><span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Movement type</span><div className="grid grid-cols-3 gap-2">{(['in', 'out', 'adjustment'] as const).map((item) => <button type="button" key={item} onClick={() => setType(item)} data-testid={`button-adjustment-type-${item}`} className={cx('rounded-xl border px-2 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[.05em] transition-colors', type === item ? 'border-primary bg-[hsl(var(--primary)/.1)] text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>{item === 'in' ? 'Inbound' : item === 'out' ? 'Outbound' : 'Correction'}</button>)}</div></div>
        <Field label={type === 'adjustment' ? 'Correction quantity' : 'Quantity'} type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" required testId="input-adjustment-quantity" />
        <label className="block"><span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Note <span className="font-sans normal-case tracking-normal text-muted-foreground/70">(recommended)</span></span><textarea value={note} onChange={(event) => setNote(event.target.value)} data-testid="input-adjustment-note" placeholder="Why did this change happen?" rows={3} className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
        {adjust.error && <p className="rounded-xl bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs text-destructive">That adjustment could not be recorded. No stock was changed.</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} data-testid="button-cancel-adjustment" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Cancel</button><button type="submit" disabled={adjust.isPending} data-testid="button-save-adjustment" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60">{adjust.isPending && <RefreshCw size={14} className="animate-spin" />}Record movement</button></div>
      </form>
    </Modal>
  );
}

function EmptyState({ icon: Icon, title, description, action, compact = false }: { icon: typeof Boxes; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return <div className={cx('text-center', compact ? 'py-8' : 'rounded-2xl border border-dashed border-border bg-card px-6 py-16')}><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon size={20} /></div><p className="mt-4 text-sm font-bold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action}</div>;
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.42)] p-4 backdrop-blur-[2px]"><div role="dialog" aria-modal="true" className="max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-[0_22px_70px_hsl(var(--foreground)/.22)] md:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-[19px] font-bold tracking-[-.035em]">{title}</h2><p className="mt-1 max-w-sm text-[12px] leading-5 text-muted-foreground">{description}</p></div><button type="button" onClick={onClose} data-testid="button-close-modal" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={17} /></button></div>{children}</div></div>;
}

function ConfirmModal({ title, description, pending, onClose, onConfirm }: { title: string; description: string; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal title="Confirm deletion" description={description} onClose={onClose}><div className="rounded-xl bg-[hsl(var(--destructive)/.07)] p-4"><div className="flex gap-3"><Trash2 className="shrink-0 text-destructive" size={18} /><p className="text-[12px] leading-5 text-destructive/85">{title} This cannot be undone from the catalog.</p></div></div><div className="mt-5 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} data-testid="button-cancel-delete" className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted">Keep product</button><button type="button" onClick={onConfirm} disabled={pending} data-testid="button-confirm-delete" className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-60">{pending && <RefreshCw size={14} className="animate-spin" />}Delete product</button></div></Modal>;
}

function NotFound() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6"><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted"><Search size={21} /></div><h1 className="mt-5 text-2xl font-bold">This shelf is empty.</h1><p className="mt-2 text-sm text-muted-foreground">The page you are looking for is not part of this workspace.</p><Link href="/" data-testid="link-back-overview" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Back to overview</Link></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={() => <Shell><DashboardPage /></Shell>} /><Route path="/pos" component={() => <Shell><POSPage /></Shell>} /><Route path="/products" component={() => <Shell><ProductsPage /></Shell>} /><Route path="/movements" component={() => <Shell><MovementsPage /></Shell>} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;






import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/*
  Dashboard (home page "/").

  Numbers come from the live API. Billing and staff figures are owner-only, so for
  anyone else those cards hide or swap instead of breaking the page.
*/

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const API = {
  enquiries: "/api/enquiry/getEnquiry", // any signed-in staff; paged
  billing: "/api/report/summary", // owner only
  employees: "/api/employee/getAllEmployee", // owner only
};
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

/* ------------------------------ data layer ------------------------------ */

const getJson = async (path) => {
  const token = localStorage.getItem("webapptoken") || localStorage.getItem("token") || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${BACKEND}${cleanPath}`, {
    headers: {
      "Content-Type": "application/json",
      token: token,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("SESSION_EXPIRED");
  }
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
};

const normalizeEnquiry = (r, i) => ({
  id: r._id || i,
  name: r.patientName || "-",
  phone: r.contactNumber || "",
  complaint: r.chiefComplaint || "",
  status: r.enquiryStatus === "patient" ? "Patient" : "Lead",
  createdAt: r.createdAt || null,
});

// The list endpoint is paged, so walk the pages and stop at the last one.
const loadEnquiries = async () => {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const r = await getJson(`${API.enquiries}?page=${page}&limit=${PAGE_SIZE}`);
    all.push(...(r.enquiries || []));
    if (!r.pagination?.hasNextPage) break;
  }
  return all.map(normalizeEnquiry);
};

const normalizeBilling = (r) => {
  const income = r?.data?.income || {};
  const billed = Number(income.billed || 0);
  const received = Number(income.received || 0);
  return { billed, received, outstanding: Number(income.pending ?? billed - received) };
};

const loadData = async () => {
  const [e, b, m] = await Promise.allSettled([loadEnquiries(), getJson(API.billing), getJson(API.employees)]);
  const emps = m.status === "fulfilled" ? m.value.employees || [] : null;
  const failureReason = e.status === "rejected" ? e.reason?.message : null;
  return {
    error: failureReason,
    enquiries: e.status === "fulfilled" ? e.value : null,
    // Money and staff figures are owner-only; for anyone else these stay hidden.
    billing: b.status === "fulfilled" ? normalizeBilling(b.value) : null,
    employees: emps
      ? { total: emps.length, active: emps.filter((x) => (x.personalDetails?.status || "Active") === "Active").length }
      : null,
  };
};

/* ------------------------------ helpers ------------------------------ */

const inr = (n) => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-");

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const Icon = ({ d, className = "h-5 w-5" }) => (
  <svg className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z",
  rupee: "M6 3h12M6 8h12M6 13l8.5 8M6 13h3a4 4 0 000-8",
  plus: "M12 5v14M5 12h14",
  list: "M9 3h6a1 1 0 011 1v1H8V4a1 1 0 011-1zM8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 12h6M9 16h6",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  users: "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  arrow: "M5 12h14M13 6l6 6-6 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
};

const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200 sm:p-6 ${className}`}>{children}</div>
);

const CardHead = ({ title, sub, action }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div>
      <h3 className="text-base font-bold tracking-tight text-slate-800">{title}</h3>
      {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
    </div>
    {action}
  </div>
);

const Kpi = ({ icon, label, value, note, tone }) => {
  const tones = {
    blue: "bg-[#0B4BAA]/10 text-[#0B4BAA]",
    cyan: "bg-[#00C2CB]/15 text-[#0A8F96]",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-600",
  };
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon d={icon} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[13px] text-slate-500">{note}</p>
    </Card>
  );
};

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      status === "Patient" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${status === "Patient" ? "bg-emerald-500" : "bg-amber-500"}`} />
    {status}
  </span>
);

const BarChart = ({ data }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-52 items-end gap-3" role="img" aria-label={`Enquiries per month: ${data.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold text-slate-600">{d.count}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-lg transition-all ${
                i === data.length - 1
                  ? "bg-gradient-to-t from-[#0B4BAA] to-[#00C2CB]"
                  : "bg-[#0B4BAA]/20 group-hover:bg-[#0B4BAA]/40"
              }`}
              style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const Donut = ({ patients, leads }) => {
  const total = patients + leads;
  const C = 2 * Math.PI * 52;
  const share = total ? patients / total : 0;
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 120 120" className="-rotate-90" role="img" aria-label={`${patients} patients and ${leads} leads`}>
        <circle cx="60" cy="60" r="52" fill="none" stroke={total ? "#00C2CB" : "#E2E8F0"} strokeWidth="14" />
        {total > 0 && (
          <circle cx="60" cy="60" r="52" fill="none" stroke="#0B4BAA" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${share * C} ${C}`} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-extrabold text-slate-900">{total}</p>
          <p className="text-xs font-medium text-slate-500">enquiries</p>
        </div>
      </div>
    </div>
  );
};

const Skeleton = () => (
  <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="h-44 rounded-3xl bg-slate-200" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-slate-200" />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="h-72 rounded-2xl bg-slate-200 lg:col-span-2" />
      <div className="h-72 rounded-2xl bg-slate-200" />
    </div>
  </div>
);

/* ------------------------------ page ------------------------------ */

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  let employee = null;
  try {
    employee = JSON.parse(localStorage.getItem("loginEmployeeData"));
  } catch {
    employee = null;
  }
  const email = employee?.personalDetails?.email || "";
  const firstName = (employee?.personalDetails?.name || email.split("@")[0] || "there").split(" ")[0];

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError("");
    loadData()
      .then((d) => {
        if (!alive) return;
        if (d.error) setLoadError(d.error);
        setData(d);
      })
      .catch((err) => {
        if (alive) {
          setLoadError(err?.message || "Failed to load");
          setData({ enquiries: null });
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reload]);

  const stats = useMemo(() => {
    const enq = data?.enquiries;
    if (!enq) return null;
    const patients = enq.filter((e) => e.status === "Patient").length;
    const leads = enq.length - patients;

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-IN", { month: "short" }), count: 0 };
    });
    enq.forEach((e) => {
      if (!e.createdAt) return;
      const d = new Date(e.createdAt);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.count += 1;
    });

    const recent = [...enq].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);
    const conversion = enq.length ? Math.round((patients / enq.length) * 100) : 0;
    return { total: enq.length, patients, leads, months, recent, conversion };
  }, [data]);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6"><Skeleton /></div>;

  if (!stats) {
    const isAuthErr = loadError === "SESSION_EXPIRED" || !localStorage.getItem("webapptoken");
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <Card className="mx-auto max-w-lg text-center">
          <p className="text-lg font-bold text-slate-800">
            {isAuthErr ? "Session Expired or Login Required" : "Could not load the dashboard"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isAuthErr
              ? "Your session has expired or is invalid. Please sign in again."
              : loadError === "Failed to fetch"
              ? "Could not reach the backend server. Check your connection or backend status."
              : loadError || "Check your connection, then try again."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {isAuthErr ? (
              <button
                onClick={() => {
                  localStorage.removeItem("webapptoken");
                  localStorage.removeItem("token");
                  window.location.assign("/auth");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B4BAA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#093d8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] focus-visible:ring-offset-2"
              >
                Sign in again
              </button>
            ) : (
              <button
                onClick={() => setReload((n) => n + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B4BAA] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#093d8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] focus-visible:ring-offset-2"
              >
                <Icon d={ICONS.refresh} className="h-4 w-4" /> Try again
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const { billing, employees } = data;
  const thisMonth = stats.months[stats.months.length - 1].count;
  const collected = billing && billing.billed ? Math.min(100, Math.round((billing.received / billing.billed) * 100)) : 0;

  const actions = [
    { name: "New Enquiry", to: "/enquiry", icon: ICONS.plus },
    { name: "All Enquiry", to: "/allEnquiry", icon: ICONS.list },
    { name: "Reports", to: "/Reports", icon: ICONS.chart },
    { name: "All Employee", to: "/allEmployee", icon: ICONS.users },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#082F6B] via-[#0B4BAA] to-[#0A5FB8] p-6 text-white shadow-xl shadow-[#0B4BAA]/20 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(0,194,203,0.35),transparent_55%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-blue-100/80">
              {today}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {greeting()}, {firstName}
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-blue-100/80">
              {stats.leads} open {stats.leads === 1 ? "lead" : "leads"} waiting for follow-up and {stats.patients} patients under care.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/enquiry"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#0B4BAA] shadow-md transition hover:bg-[#E6F9FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B4BAA]"
              >
                <Icon d={ICONS.plus} className="h-4 w-4" /> New Enquiry
              </Link>
              <Link
                to="/allEnquiry"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                View all enquiries <Icon d={ICONS.arrow} className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            {[
              { label: "New this month", value: thisMonth },
              { label: "Conversion", value: `${stats.conversion}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15 backdrop-blur">
                <p className="text-2xl font-extrabold">{s.value}</p>
                <p className="text-xs font-medium text-blue-100/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ICONS.inbox} tone="blue" label="Total Enquiries" value={stats.total} note="All time" />
        <Kpi icon={ICONS.heart} tone="cyan" label="Active Patients" value={stats.patients} note={`${stats.conversion}% of enquiries converted`} />
        <Kpi icon={ICONS.phone} tone="amber" label="Open Leads" value={stats.leads} note="Need a follow-up call" />
        {billing ? (
          <Kpi icon={ICONS.rupee} tone="rose" label="Outstanding Dues" value={inr(billing.outstanding)} note="Still to collect" />
        ) : (
          <Kpi icon={ICONS.users} tone="rose" label="New this month" value={thisMonth} note="Enquiries received" />
        )}
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="Enquiries per month" sub="Last 6 months" />
          <BarChart data={stats.months} />
        </Card>
        <Card>
          <CardHead title="Leads vs patients" />
          <Donut patients={stats.patients} leads={stats.leads} />
          <div className="mt-5 flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0B4BAA]" /> Patients {stats.patients}
            </span>
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00C2CB]" /> Leads {stats.leads}
            </span>
          </div>
        </Card>
      </section>

      {/* Recent + side column */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            title="Recent enquiries"
            sub="Latest 6 entries"
            action={
              <Link to="/allEnquiry" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0B4BAA] hover:underline">
                View all <Icon d={ICONS.arrow} className="h-4 w-4" />
              </Link>
            }
          />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2 font-semibold">Patient</th>
                  <th className="px-2 py-2 font-semibold">Contact</th>
                  <th className="px-2 py-2 font-semibold">Complaint</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent.map((e) => (
                  <tr key={e.id} className="transition hover:bg-slate-50">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0B4BAA]/10 text-xs font-bold uppercase text-[#0B4BAA]">
                          {e.name.charAt(0)}
                        </span>
                        <span className="font-semibold text-slate-800">{e.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-slate-600">{e.phone || "-"}</td>
                    <td className="px-2 py-3 text-slate-600">{e.complaint || "-"}</td>
                    <td className="px-2 py-3"><StatusPill status={e.status} /></td>
                    <td className="px-2 py-3 text-slate-500">{fmtDate(e.createdAt)}</td>
                  </tr>
                ))}
                {stats.recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-slate-400">No enquiries yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          {billing && (
            <Card>
              <CardHead title="Revenue overview" sub="All time" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900">{inr(billing.received)}</p>
                  <p className="text-[13px] text-slate-500">received of {inr(billing.billed)} billed</p>
                </div>
                <span className="rounded-full bg-[#00C2CB]/15 px-2.5 py-1 text-xs font-bold text-[#0A8F96]">{collected}% collected</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00C2CB] to-[#0B4BAA]" style={{ width: `${collected}%` }} />
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-slate-500">Outstanding</span>
                <span className="font-bold text-rose-600">{inr(billing.outstanding)}</span>
              </div>
            </Card>
          )}

          <Card>
            <CardHead title="Quick actions" />
            <div className="grid grid-cols-2 gap-3">
              {actions.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#0B4BAA]/40 hover:bg-[#E6F9FA]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0B4BAA]/10 text-[#0B4BAA] transition group-hover:bg-[#0B4BAA] group-hover:text-white">
                    <Icon d={a.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{a.name}</span>
                </Link>
              ))}
            </div>
            {employees && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-[13px] text-slate-500">
                Team: <span className="font-semibold text-slate-700">{employees.active}</span> active of {employees.total} employees
              </p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;


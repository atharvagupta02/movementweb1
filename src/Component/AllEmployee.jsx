// import React, { useEffect, useState } from "react";
// import CreateEmployeeForm from "./CreateEmployeeForm";
// import { Link } from "react-router-dom";

// const AllEmployee = () => {
//   const [allEmployeeData, setAllEmployeeData] = useState([]);
//   const [lastEmployeeNumber, setLastEmployeeNumber] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sortBy, setSortBy] = useState("newest");
//   const [showEmployeeForm, setShowEmployeeForm] = useState(false);
//   const employee = JSON.parse(localStorage.getItem("loginEmployeeData"));

//   const fetchAllEmployees = async () => {
//     try {
//       const response = await fetch(
//         `${import.meta.env.VITE_BACKEND_URL}/api/employee/getAllEmployee`,
//       );

//       const result = await response.json();
//       // console.log("Employee data:", result);

//       if (result.success && result.employees.length > 0) {
//         setAllEmployeeData(result.employees);

//         // ⚠️ Make sure employees are sorted (latest first)
//         const lastEmployee = result.employees[0];
//         // console.log("last employee", lastEmployee);
//         const lastEmployeeNumber = lastEmployee?.personalDetails?.employeeId;

//         // console.log("Last employee number:", lastEmployeeNumber);

//         // ✅ Correct regex
//         const match = lastEmployeeNumber?.match(/^(.+)-(\d+)$/);
//         // console.log("match:", match);

//         if (match) {
//           const prefix = match[1]; // MR-EMP
//           const number = parseInt(match[2], 10) + 1;

//           const newEmployeeId = `${prefix}-${number
//             .toString()
//             .padStart(4, "0")}`;

//           setLastEmployeeNumber(newEmployeeId);
//         } else {
//           setLastEmployeeNumber("MR-EMP-0001");
//         }
//       } else {
//         setLastEmployeeNumber("MR-EMP-0001");
//       }
//     } catch (error) {
//       console.error("Error fetching employee data:", error);
//       setLastEmployeeNumber("MR-EMP-0001");
//     }
//   };

//   // console.log("last employee number", lastEmployeeNumber);

//   useEffect(() => {
//     fetchAllEmployees();
//   }, []);

//   const getFilteredEnquiries = () => {
//     let filtered = [...allEmployeeData];

//     /* ---- SEARCH (Name | Phone | EmployeeId | PatientId) ---- */
//     if (searchTerm.trim()) {
//       const term = searchTerm.toLowerCase();

//       filtered = filtered.filter((item) => {
//         const nameMatch = item?.personalDetails?.fullName
//           ?.toLowerCase()
//           .includes(term);
//         const phoneMatch = item?.personalDetails?.contactNumber?.includes(term);
//         const employeeIdMatch = item?.personalDetails?.employeeId
//           ?.toLowerCase()
//           .includes(term);

//         return nameMatch || phoneMatch || employeeIdMatch;
//       });
//     }

//     /* ---- SORT BY CREATED AT ---- */
//     filtered.sort((a, b) => {
//       const dateA = new Date(a.createdAt);
//       const dateB = new Date(b.createdAt);
//       return sortBy === "newest" ? dateB - dateA : dateA - dateB;
//     });

//     return filtered;
//   };
// if (employee?.personalDetails?.email !== import.meta.env.VITE_ADMIN_EMAIL) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <p className="text-2xl font-semibold text-gray-600">
//           You are not authorized to view this page.
//         </p>
//       </div>
//     )
//   }

//   return (
//     <div className="px-2">
//       <div className="flex flex-wrap gap-2 mt-10 mb-4 text-black font-semibold text-xl">
//         {"employee".toUpperCase()} :-{" "}
//         <span className="text-gray-600">{getFilteredEnquiries().length}</span>
//       </div>

//       <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
//         {/* SEARCH */}
//         <input
//           type="text"
//           placeholder="Search by name, phone, or patient ID"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="px-4 py-2 border rounded w-full md:w-1/2"
//         />

//         {/* SORT */}
//         <select
//           value={sortBy}
//           onChange={(e) => setSortBy(e.target.value)}
//           className="px-4 py-2 border rounded w-full md:w-1/4"
//         >
//           <option value="newest">Newest First</option>
//           <option value="oldest">Oldest First</option>
//         </select>

//         <div className="flex justify-end ">
//           <button
//             onClick={() => setShowEmployeeForm(true)}
//             className="bg-green-600 text-white px-4 py-2 rounded"
//           >
//             + Create Employee
//           </button>
//         </div>
//       </div>

//       {/* LIST */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
//         {getFilteredEnquiries().length === 0 ? (
//           <div className="col-span-full text-center py-12">
//             <p className="text-lg font-medium text-gray-600">
//               No Employee match your filters
//             </p>
//             <p className="text-sm text-gray-400">
//               Try changing filters or search keywords
//             </p>
//           </div>
//         ) : (
//           getFilteredEnquiries().map((entry) => (
//             <div
//               key={entry._id}
//               className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition"
//             >
//               {/* {console.log("entry" , entry)} */}
//               {/* Header */}
//               <div className="mb-2">
//                 <p className="text-xs text-gray-500">
//                   Employee ID:{" "}
//                   <span className="font-medium">
//                     {entry?.personalDetails?.employeeId}
//                   </span>
//                 </p>

//                 <h3 className="font-semibold text-gray-800 text-base">
//                   <span>Name- </span>
//                   <span className="text-sm text-gray-500">
//                     {entry?.personalDetails?.fullName}
//                   </span>
//                 </h3>

//                 <p className="font-semibold text-gray-800 text-base">
//                   <span className="text-sm text-gray-500">Contact number-</span>{" "}
//                   {entry?.personalDetails?.contactNumber}
//                 </p>
//               </div>

//               <div className="text-sm text-gray-600 space-y-1 mb-3">
//                 <p>
//                   <span className="font-medium">Experience:</span>{" "}
//                   {entry?.personalDetails?.experience} yrs
//                 </p>
//                 <p className="text-sm text-gray-600">
//                   <span className="font-medium"> Qualification:</span>{" "}
//                   {entry?.personalDetails?.qualification || "-"}
//                 </p>
//                 <p>
//                   <span className="font-medium">Branch:</span>{" "}
//                   {entry?.personalDetails?.workingBranch}
//                 </p>
//               </div>

//               {/* Footer */}

//               <div className="flex items-center justify-between gap-2 ">
//                 <p>
//                   <span className="font-medium">Status:</span>{" "}
//                   <span
//                     className={`font-medium ${
//                       entry?.personalDetails?.status === "Active"
//                         ? "text-green-600"
//                         : "text-red-600"
//                     }`}
//                   >
//                     {entry?.personalDetails?.status}
//                   </span>
//                 </p>
//                 <Link
//                   to={`/EmployeeDetails/${entry?._id}`}
//                   className="text-sm text-blue-600 hover:underline font-medium"
//                 >
//                   View Details →
//                 </Link>
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       {showEmployeeForm && (
//         <CreateEmployeeForm
//           onClose={() => setShowEmployeeForm(false)}
//           lastEmployeeNumber={lastEmployeeNumber}
//           fetchAllEmployees={fetchAllEmployees}
//         />
//       )}
//     </div>
//   );
// };

// export default AllEmployee;





import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react"; // npm install qrcode.react
import CreateEmployeeForm from "./CreateEmployeeForm";

/*
  Staff management page.
  Same API as before: GET {VITE_BACKEND_URL}/api/employee/getAllEmployee
  Same admin-only rule, same CreateEmployeeForm props, same /EmployeeDetails/:id link.

  Every employee gets a QR code. It holds a link to that employee's profile page
  (no personal data inside the QR). Scanning it on a phone that is logged in opens the profile.
*/

const pd = (e) => e?.personalDetails || {};
const qrValue = (e) => `${window.location.origin}/EmployeeDetails/${e._id}`;
const isActive = (e) => pd(e).status === "Active";

const Icon = ({ d, className = "h-5 w-5" }) => (
  <svg className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  print: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  lock: "M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1zM8 11V7a4 4 0 118 0v4",
  link: "M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5",
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1",
  close: "M6 18L18 6M6 6l12 12",
  alert: "M12 8v4M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

const StatusPill = ({ active }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
    {active ? "Active" : "Inactive"}
  </span>
);

/* ---------- Printable ID card (credit-card size, 85.6 x 54 mm) ---------- */
const IdCard = ({ emp }) => {
  const p = pd(emp);
  return (
    <div
      style={{ width: "85.6mm", height: "54mm" }}
      className="flex flex-col overflow-hidden rounded-[3mm] bg-white shadow-xl ring-1 ring-slate-300"
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-[#0B4BAA] to-[#082F6B] px-[4mm] py-[2.4mm]">
        <span className="text-[3.4mm] font-extrabold tracking-wide text-white">MOVEMENT REHAB</span>
        <span className="text-[2.2mm] font-semibold tracking-widest text-cyan-200">STAFF ID</span>
      </div>
      <div className="flex flex-1 items-center gap-[3.5mm] px-[4mm]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[4.2mm] font-bold leading-tight text-slate-900">{p.fullName || "-"}</p>
          <p className="truncate text-[2.8mm] text-slate-600">{p.qualification || "Staff"}</p>
          <p className="mt-[2mm] text-[2.2mm] font-semibold uppercase tracking-wider text-slate-400">Employee ID</p>
          <p className="text-[4.2mm] font-extrabold tracking-wider text-[#0B4BAA]">{p.employeeId || "Pending"}</p>
          <p className="mt-[1mm] truncate text-[2.4mm] text-slate-500">{p.workingBranch || ""}</p>
        </div>
        <div className="shrink-0 rounded-[1.5mm] bg-white p-[1.2mm] ring-1 ring-slate-200">
          <QRCodeSVG value={qrValue(emp)} level="M" style={{ width: "21mm", height: "21mm" }} />
        </div>
      </div>
      <div className="flex items-center justify-between bg-[#00C2CB] px-[4mm] py-[1.1mm]">
        <span className="text-[2mm] font-semibold text-[#051F4A]">Scan to open staff profile</span>
        <span className="text-[2mm] font-semibold text-[#051F4A]">{p.contactNumber || ""}</span>
      </div>
    </div>
  );
};

const AllEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("cards");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [cardEmp, setCardEmp] = useState(null);
  const [printList, setPrintList] = useState([]);
  const [toast, setToast] = useState("");

  let me = null;
  try {
    me = JSON.parse(localStorage.getItem("loginEmployeeData"));
  } catch {
    me = null;
  }
  const isAdmin = me?.personalDetails?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const fetchAllEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
      const token = localStorage.getItem("webapptoken") || localStorage.getItem("token") || "";
      const response = await fetch(`${backendUrl}/api/employee/getAllEmployee`, {
        headers: {
          "Content-Type": "application/json",
          token: token,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const result = await response.json();
      if (result.success) {
        setEmployees(result.employees || []);
      } else {
        setError(result.message || "Could not load the employees.");
      }
    } catch (err) {
      console.error("Error fetching employee data:", err);
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAllEmployees();
  }, [isAdmin]);

  // Next employee ID = highest existing number + 1 (does not depend on list order)
  const nextEmployeeId = useMemo(() => {
    let prefix = "MR-EMP";
    let max = 0;
    employees.forEach((e) => {
      const m = pd(e).employeeId?.match(/^(.+)-(\d+)$/);
      if (m) {
        prefix = m[1];
        max = Math.max(max, parseInt(m[2], 10));
      }
    });
    return `${prefix}-${String(max + 1).padStart(4, "0")}`;
  }, [employees]);

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter(isActive).length,
      inactive: employees.filter((e) => !isActive(e)).length,
      noId: employees.filter((e) => !pd(e).employeeId).length,
    }),
    [employees]
  );

  const filtered = useMemo(() => {
    let list = [...employees];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((e) => {
        const p = pd(e);
        return (
          p.fullName?.toLowerCase().includes(term) ||
          String(p.contactNumber || "").includes(term) ||
          p.employeeId?.toLowerCase().includes(term)
        );
      });
    }
    if (statusFilter === "active") list = list.filter(isActive);
    if (statusFilter === "inactive") list = list.filter((e) => !isActive(e));
    list.sort((a, b) => {
      if (sortBy === "name") return (pd(a).fullName || "").localeCompare(pd(b).fullName || "");
      const d = new Date(b.createdAt) - new Date(a.createdAt);
      return sortBy === "newest" ? d : -d;
    });
    return list;
  }, [employees, searchTerm, sortBy, statusFilter]);

  /* ---------- printing ---------- */
  useEffect(() => {
    const clear = () => setPrintList([]);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  const printCards = (list) => {
    if (!list.length) return;
    setPrintList(list);
    setTimeout(() => window.print(), 150);
  };
  const printable = filtered.filter((e) => isActive(e) && pd(e).employeeId);

  /* ---------- small helpers ---------- */
  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };
  const copyLink = async (emp) => {
    try {
      await navigator.clipboard.writeText(qrValue(emp));
      flash("Profile link copied");
    } catch {
      flash("Could not copy the link");
    }
  };

  useEffect(() => {
    if (!cardEmp) return;
    const onKey = (e) => e.key === "Escape" && setCardEmp(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardEmp]);

  /* ---------- not admin ---------- */
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-6 pt-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <Icon d={ICONS.lock} className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-800">Admin access only</h2>
        <p className="mt-1.5 text-sm text-slate-500">You are not authorized to view this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Staff management</h2>
          <p className="mt-0.5 text-sm text-slate-500">Manage your team. Every employee has an ID and a QR code.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => printCards(printable)}
            disabled={!printable.length}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon d={ICONS.print} className="h-4 w-4" /> Print ID cards ({printable.length})
          </button>
          <button
            onClick={() => setShowEmployeeForm(true)}
            disabled={loading || !!error}
            title={error ? "Reload the list first so the next employee ID is correct" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B4BAA] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0B4BAA]/30 transition hover:bg-[#093d8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon d={ICONS.plus} className="h-4 w-4" /> Create Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total staff", value: stats.total, tone: "text-[#0B4BAA]" },
          { label: "Active", value: stats.active, tone: "text-emerald-600" },
          { label: "Inactive", value: stats.inactive, tone: "text-rose-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <p className="text-xs font-semibold text-slate-500 sm:text-sm">{s.label}</p>
            <p className={`mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl ${s.tone}`}>{loading ? "-" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
          <Icon d={ICONS.alert} className="h-5 w-5" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchAllEmployees} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
            Try again
          </button>
        </div>
      )}
      {!loading && !error && stats.noId > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <Icon d={ICONS.alert} className="mt-0.5 h-5 w-5" />
          <span>
            <b>{stats.noId}</b> {stats.noId === 1 ? "employee has" : "employees have"} no Employee ID, so no ID card can be printed. These are marked "ID pending" below.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon d={ICONS.search} className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or employee ID"
            aria-label="Search employees"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#0B4BAA] focus:bg-white focus:ring-4 focus:ring-[#00C2CB]/20"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0B4BAA] focus:ring-4 focus:ring-[#00C2CB]/20"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          aria-label="Sort employees"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0B4BAA] focus:ring-4 focus:ring-[#00C2CB]/20"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A to Z</option>
        </select>
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Change view">
          {[
            ["cards", ICONS.grid, "Card view"],
            ["list", ICONS.list, "List view"],
          ].map(([v, icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-label={label}
              aria-pressed={view === v}
              className={`rounded-lg p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] ${view === v ? "bg-white text-[#0B4BAA] shadow-sm" : "text-slate-500 hover:text-[#0B4BAA]"}`}
            >
              <Icon d={icon} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid animate-pulse gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-60 rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-lg font-semibold text-slate-700">No employees match your filters</p>
          <p className="mt-1 text-sm text-slate-400">Try changing the filters or the search words.</p>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => {
            const p = pd(entry);
            const active = isActive(entry);
            return (
              <div key={entry._id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0B4BAA] to-[#082F6B] text-lg font-bold uppercase text-white">
                    {(p.fullName || "?").charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-slate-900">{p.fullName || "-"}</h3>
                    {p.employeeId ? (
                      <span className="mt-1 inline-block rounded-md bg-[#0B4BAA]/10 px-2 py-0.5 text-xs font-bold tracking-wide text-[#0B4BAA]">{p.employeeId}</span>
                    ) : (
                      <span className="mt-1 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">ID pending</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCardEmp(entry)}
                    aria-label={`Open ID card for ${p.fullName}`}
                    title="Open ID card"
                    className={`shrink-0 rounded-xl border border-slate-200 bg-white p-1.5 transition hover:border-[#0B4BAA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] ${active ? "" : "opacity-40"}`}
                  >
                    <QRCodeSVG value={qrValue(entry)} size={64} level="M" />
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contact</dt>
                    <dd className="font-medium text-slate-800">{p.contactNumber || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experience</dt>
                    <dd className="font-medium text-slate-800">{p.experience ?? 0} yrs</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Qualification</dt>
                    <dd className="font-medium text-slate-800">{p.qualification || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Branch</dt>
                    <dd className="font-medium text-slate-800">{p.workingBranch || "-"}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                  <StatusPill active={active} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCardEmp(entry)}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB]"
                    >
                      ID card
                    </button>
                    <Link to={`/EmployeeDetails/${entry._id}`} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#0B4BAA] transition hover:bg-[#E6F9FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB]">
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                {["Employee", "ID", "Contact", "Qualification", "Exp.", "Branch", "Status", "QR", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => {
                const p = pd(entry);
                return (
                  <tr key={entry._id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0B4BAA]/10 text-xs font-bold uppercase text-[#0B4BAA]">{(p.fullName || "?").charAt(0)}</span>
                        <span className="font-semibold text-slate-800">{p.fullName || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0B4BAA]">{p.employeeId || <span className="text-amber-700">Pending</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{p.contactNumber || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.qualification || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.experience ?? 0} yrs</td>
                    <td className="px-4 py-3 text-slate-600">{p.workingBranch || "-"}</td>
                    <td className="px-4 py-3"><StatusPill active={isActive(entry)} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setCardEmp(entry)} aria-label={`Open ID card for ${p.fullName}`} className="rounded-lg p-1.5 text-[#0B4BAA] hover:bg-[#E6F9FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB]">
                        <Icon d={ICONS.qr} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/EmployeeDetails/${entry._id}`} className="font-semibold text-[#0B4BAA] hover:underline">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ID card modal */}
      {cardEmp && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/60 backdrop-blur-sm" onClick={() => setCardEmp(null)}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-label="Employee ID card" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Employee ID card</h3>
                <button onClick={() => setCardEmp(null)} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB]">
                  <Icon d={ICONS.close} />
                </button>
              </div>
              <div className="flex justify-center rounded-xl bg-slate-100 p-5">
                <IdCard emp={cardEmp} />
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">The QR opens this employee's profile. It works for logged-in staff only.</p>
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button onClick={() => copyLink(cardEmp)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB]">
                  <Icon d={ICONS.link} className="h-4 w-4" /> Copy link
                </button>
                <button
                  onClick={() => printCards([cardEmp])}
                  disabled={!pd(cardEmp).employeeId}
                  title={!pd(cardEmp).employeeId ? "This employee has no ID yet" : undefined}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B4BAA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#093d8c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2CB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon d={ICONS.print} className="h-4 w-4" /> Print card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmployeeForm && (
        <CreateEmployeeForm
          onClose={() => setShowEmployeeForm(false)}
          lastEmployeeNumber={nextEmployeeId}
          fetchAllEmployees={fetchAllEmployees}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Print sheet: lives outside #root so only the ID cards are printed */}
      {createPortal(
        <>
          <style>{`
            .print-sheet { display: none; }
            @page { size: A4; margin: 0; }
            @media print {
              #root { display: none !important; }
              body { padding: 0 !important; background: #fff !important; }
              .print-sheet { display: block !important; padding: 10mm; }
              .print-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}</style>
          <div className="print-sheet">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 85.6mm)", gap: "6mm" }}>
              {printList.map((e) => (
                <div key={e._id} style={{ breakInside: "avoid" }}>
                  <IdCard emp={e} />
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default AllEmployee;


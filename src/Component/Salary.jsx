import { Fragment, useState, useEffect, useCallback } from "react";
import SalaryReportPdf from "./pdf/SalaryReportPdf";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  MdEdit,
  MdClose,
  MdCheck,
  MdAdd,
  MdDeleteOutline,
  MdFileDownload,
  MdCheckCircle,
  MdErrorOutline,
  MdPayments,
  MdPendingActions,
  MdTrendingUp,
  MdTaskAlt,

  MdPictureAsPdf,
  MdRemoveCircleOutline,
} from "react-icons/md";
import { exportToExcel } from "../utils/exportToExcel";
import { FaWhatsapp } from "react-icons/fa";
import { fetchReport, MONTHS, YEARS, formatINR } from "../utils/reportFetch";

/* ------------------------------------------------------------------ */
/* Design tokens (shared look with the Rent page)                      */
/* ------------------------------------------------------------------ */
const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";
const SELECT = `${FIELD} sm:w-auto sm:min-w-[9.5rem]`;
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/30";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20";
const BTN_GHOST =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20";
// Compact labelled buttons used for per-employee actions in the sheet tables
const BTN_SLIP =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 disabled:cursor-wait disabled:opacity-60";
const BTN_WHATSAPP =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/20";

// Add-sheet row layout on desktop (name, role, month, gross, deduction, status, delete)
const FORM_GRID =
  "xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(10.5rem,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem]";

const STATUS = {
  Paid: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
    bar: "bg-emerald-400",
  },
  Unpaid: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-800 ring-rose-600/15",
    bar: "bg-rose-400",
  },
};

const formatMonth = (value) => {
  // Pay month is stored as "YYYY-MM"; show it as "Mar 2026". Anything else is shown as-is.
  if (/^\d{4}-\d{2}$/.test(value || "")) {
    const [y, m] = value.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }
  return value || "-";
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const PAYMENT_MODES = ["Cash", "UPI", "Bank transfer", "Cheque", "Card", "Other"];

// Today as YYYY-MM-DD in the local time zone (for date inputs).
const todayStr = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const dateInputValue = (v) => (v ? String(v).slice(0, 10) : "");

const formatPayDate = (v) =>
  v && !isNaN(new Date(v).getTime())
    ? new Date(v).toLocaleDateString("en-IN")
    : "-";

// "YYYY-MM" of the current month — used as the default pay month for a new row.
const currentPayMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ */
/* Salary maths: gross - deduction = net pay                           */
/* ------------------------------------------------------------------ */
const num = (v) => Number(v) || 0;
const grossOf = (emp) => num(emp.salary);
// A deduction can never be negative or larger than the gross salary.
const deductionOf = (emp) => Math.max(0, Math.min(num(emp.deduction), grossOf(emp)));
const netSalaryOf = (emp) => Math.max(0, grossOf(emp) - deductionOf(emp));

const sum = (list, fn) => list.reduce((total, item) => total + fn(item), 0);

/* ------------------------------------------------------------------ */
/* Amount in words (Indian numbering) for the salary slip              */
/* ------------------------------------------------------------------ */
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const twoDigits = (n) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;

const amountInWords = (value) => {
  let n = Math.round(num(value));
  if (n <= 0) return "Rupees Zero only";
  const parts = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (crore) parts.push(`${twoDigits(crore % 100)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(`${hundred || thousand || lakh || crore ? "and " : ""}${twoDigits(rest)}`);
  return `Rupees ${parts.join(" ")} only`;
};

/* ------------------------------------------------------------------ */
/* Individual salary slip (PDF)                                        */
/* ------------------------------------------------------------------ */
const slipStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#172033" },
  header: {
    backgroundColor: "#12356d",
    color: "#ffffff",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#dbeafe" },
  slipTitle: { fontSize: 14, fontWeight: "bold", textAlign: "right" },
  slipPeriod: { fontSize: 9, color: "#dbeafe", textAlign: "right", marginTop: 4 },
  detailsBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detail: { width: "50%", marginBottom: 10 },
  detailLabel: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  detailValue: { fontSize: 10.5, fontWeight: "bold" },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  tableHeadText: { fontSize: 9, fontWeight: "bold", color: "#475569" },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  rowNote: { fontSize: 8, color: "#64748b", marginTop: 2 },
  deductionValue: { color: "#be123c", fontWeight: "bold" },
  value: { fontWeight: "bold" },
  net: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#eff6ff",
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netLabel: { fontSize: 11, fontWeight: "bold", color: "#12356d" },
  netValue: { fontSize: 15, fontWeight: "bold", color: "#12356d" },
  words: { marginTop: 10, fontSize: 9, color: "#475569" },
  signatures: { marginTop: 70, flexDirection: "row", justifyContent: "space-between" },
  signature: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
    paddingTop: 5,
    textAlign: "center",
    fontSize: 8,
    color: "#64748b",
  },
  footer: { marginTop: 36, color: "#94a3b8", fontSize: 8, textAlign: "center" },
});

const rs = (n) => `Rs. ${num(n).toLocaleString("en-IN")}`;

const SalarySlipDocument = ({ employee }) => {
  const gross = grossOf(employee);
  const deduction = deductionOf(employee);
  const net = netSalaryOf(employee);
  const details = [
    ["Employee", employee.name || "-"],
    ["Role", employee.role || "-"],
    ["Pay month", formatMonth(employee.month)],
    ["Payment status", employee.paid ? "Paid" : "Unpaid"],
    ["Payment mode", employee.paid ? employee.paymentMode || "-" : "-"],
    ["Payment date", employee.paid ? formatPayDate(employee.paymentDate) : "-"],
  ];
  return (
    <Document title={`Salary slip - ${employee.name || "Employee"}`}>
      <Page size="A4" style={slipStyles.page}>
        <View style={slipStyles.header}>
          <View>
            <Text style={slipStyles.brand}>Movement Rehab</Text>
            <Text style={slipStyles.subtitle}>Salary statement</Text>
          </View>
          <View>
            <Text style={slipStyles.slipTitle}>SALARY SLIP</Text>
            <Text style={slipStyles.slipPeriod}>{formatMonth(employee.month)}</Text>
          </View>
        </View>

        <View style={slipStyles.detailsBox}>
          {details.map(([label, value]) => (
            <View key={label} style={slipStyles.detail}>
              <Text style={slipStyles.detailLabel}>{label}</Text>
              <Text style={slipStyles.detailValue}>{String(value)}</Text>
            </View>
          ))}
        </View>

        <View style={slipStyles.tableHead}>
          <Text style={slipStyles.tableHeadText}>Description</Text>
          <Text style={slipStyles.tableHeadText}>Amount</Text>
        </View>
        <View style={slipStyles.tableRow}>
          <Text>Gross salary</Text>
          <Text style={slipStyles.value}>{rs(gross)}</Text>
        </View>
        <View style={slipStyles.tableRow}>
          <View>
            <Text>Less: deductions</Text>
            {deduction > 0 && employee.deductionReason ? (
              <Text style={slipStyles.rowNote}>{employee.deductionReason}</Text>
            ) : null}
          </View>
          <Text style={deduction > 0 ? slipStyles.deductionValue : slipStyles.value}>
            {deduction > 0 ? `- ${rs(deduction)}` : rs(0)}
          </Text>
        </View>

        <View style={slipStyles.net}>
          <Text style={slipStyles.netLabel}>Net salary payable</Text>
          <Text style={slipStyles.netValue}>{rs(net)}</Text>
        </View>
        <Text style={slipStyles.words}>{amountInWords(net)}</Text>

        <View style={slipStyles.signatures}>
          <Text style={slipStyles.signature}>Employer signature</Text>
          <Text style={slipStyles.signature}>Employee signature</Text>
        </View>

        <Text style={slipStyles.footer}>
          This is a computer-generated salary slip. Generated on {formatPayDate(new Date())}.
        </Text>
      </Page>
    </Document>
  );
};

const slipFileName = (emp) =>
  `Salary_Slip_${(emp.name || "Employee").replace(/[^a-z0-9]+/gi, "_")}_${emp.month || "Period"}.pdf`;

// Generates the slip on demand (only when the button is clicked) and downloads it.
const downloadSlip = async (emp) => {
  const blob = await pdf(<SalarySlipDocument employee={emp} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = slipFileName(emp);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const shareSalaryOnWhatsApp = (emp) => {
  const gross = grossOf(emp);
  const deduction = deductionOf(emp);
  const net = netSalaryOf(emp);
  const message = [
    `*Movement Rehab - Salary Slip*`,
    ``,
    `Employee: ${emp.name || "-"}`,
    `Role: ${emp.role || "-"}`,
    `Month: ${formatMonth(emp.month)}`,
    ``,
    `Gross salary: ₹${formatINR(gross)}`,
    deduction > 0
      ? `Deduction: -₹${formatINR(deduction)}${emp.deductionReason ? ` (${emp.deductionReason})` : ""}`
      : "",
    `*Net salary: ₹${formatINR(net)}*`,
    ``,
    emp.paid
      ? `Status: Paid${emp.paymentMode ? ` via ${emp.paymentMode}` : ""}${
          emp.paymentDate ? ` on ${formatPayDate(emp.paymentDate)}` : ""
        }`
      : `Status: Unpaid`,
  ]
    .filter((line, i, arr) => line !== "" || (arr[i - 1] !== "" && i !== 0))
    .join("\n");
  window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer",
  );
};

const blankEmployee = () => ({
  name: "",
  role: "",
  month: currentPayMonth(),
  salary: 0,
  deduction: 0,
  deductionReason: "",
  paid: false,
  paymentMode: "",
  paymentDate: "",
});

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */
const Panel = ({ title, description, aside, children, className = "" }) => (
  <section
    className={`rounded-xl border border-slate-200/80 bg-white shadow-sm ${className}`}
  >
    {title && (
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {aside}
      </header>
    )}
    {children}
  </section>
);

const StatusPill = ({ paid }) => {
  const key = paid ? "Paid" : "Unpaid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS[key].pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS[key].dot}`} />
      {key}
    </span>
  );
};

const Initial = ({ name }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-sm font-semibold text-cyan-800 ring-1 ring-cyan-100">
    {(name || "?").trim().charAt(0).toUpperCase() || "?"}
  </span>
);

const FieldLabel = ({ htmlFor, children }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-sm font-medium text-slate-700 xl:sr-only"
  >
    {children}
  </label>
);

const Label = ({ htmlFor, children }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-sm font-medium text-slate-700"
  >
    {children}
  </label>
);

const compact = (n) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n) || 0);

// "2026-03" -> "Mar 26" for chart axes
const chartLabel = (key) => {
  if (/^\d{4}-\d{2}$/.test(key || "")) {
    const [y, m] = key.split("-");
    const mon = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", {
      month: "short",
    });
    return `${mon} ${y.slice(2)}`;
  }
  return key || "-";
};

const KPI_TONES = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
};

const Kpi = ({ icon, tone, label, value, hint }) => (
  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${KPI_TONES[tone]}`}
      >
        {icon}
      </span>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
      {value}
    </p>
    <p className="mt-1 truncate text-sm text-slate-500">{hint}</p>
  </div>
);

const SkeletonRows = ({ rows = 4, cols = 4 }) =>
  Array.from({ length: rows }).map((_, r) => (
    <tr key={r}>
      {Array.from({ length: cols }).map((__, c) => (
        <td key={c} className="px-6 py-4">
          <div className="h-3.5 w-full max-w-[7rem] animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        </td>
      ))}
    </tr>
  ));

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const Salary = () => {
  const [employees, setEmployees] = useState([blankEmployee()]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Edit panel (status, payment details and deduction of a saved row)
  const [editId, setEditId] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateMode, setUpdateMode] = useState("");
  const [updateDate, setUpdateDate] = useState("");
  const [updateDeduction, setUpdateDeduction] = useState(0);
  const [updateReason, setUpdateReason] = useState("");

  // Quick "Mark paid" from the pending payments list
  const [quickKey, setQuickKey] = useState(null);
  const [quickMode, setQuickMode] = useState("");
  const [quickDate, setQuickDate] = useState("");

  const [allEmployeeData, setAllEmployeeData] = useState([]);

  // Id of the employee row whose slip PDF is being generated
  const [slipBusy, setSlipBusy] = useState(null);

  const [toast, setToast] = useState(null); // { type: "success" | "error", text }

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleChange = (index, field, value) => {
    const updated = [...employees];
    const current = updated[index];

    if (field === "paid") {
      const paid = value === "true";
      updated[index] = paid
        ? { ...current, paid, paymentDate: current.paymentDate || todayStr() }
        : { ...current, paid, paymentMode: "", paymentDate: "" };
    } else if (field === "deduction") {
      updated[index] = {
        ...current,
        deduction: Math.max(0, Number(value) || 0),
        // Clearing the deduction also clears its reason
        deductionReason: Number(value) > 0 ? current.deductionReason : "",
      };
    } else {
      updated[index] = {
        ...current,
        [field]: field === "salary" ? Number(value) : value,
      };
    }
    setEmployees(updated);
  };

  const addEmployee = () => {
    setEmployees([...employees, blankEmployee()]);
  };

  const removeEmployee = (index) => {
    if (employees.length === 1) return;
    setEmployees(employees.filter((_, i) => i !== index));
    setActiveDropdown(null);
  };

  const totalGrossForm = sum(employees, grossOf);
  const totalDeductionForm = sum(employees, deductionOf);
  const totalSalary = sum(employees, netSalaryOf); // net payable

  const filteredEmployeeOptions = (searchValue) => {
    return allEmployeeData.filter((emp) =>
      emp?.personalDetails?.fullName
        ?.toLowerCase()
        .includes(searchValue.toLowerCase()),
    );
  };

  const handleEmployeeSelect = (index, employee) => {
    const updated = [...employees];

    updated[index] = {
      ...updated[index],
      name: employee?.personalDetails?.fullName || "",
      role: employee?.personalDetails?.qualification || "",
    };

    setEmployees(updated);
    setActiveDropdown(null);
  };

  // Server-side filtered: each entry already contains only the matching
  // employees, so we render/total it directly.
  const fetchSalaryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReport("salary", {
        month: selectedMonth,
        year: selectedYear,
      });
      setSalaryData(data);
    } catch (err) {
      console.error("Error fetching salary data:", err);
      setError("Failed to load salary data. Please try again.");
      setSalaryData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchAllEmployees = async () => {
    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
      const token = localStorage.getItem("webapptoken") || localStorage.getItem("token") || "";
      const response = await fetch(
        `${backendUrl}/api/employee/getAllEmployee`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const result = await response.json();

      if (result.success && result.employees.length > 0) {
        setAllEmployeeData(result?.employees);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  useEffect(() => {
    fetchAllEmployees();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const overDeducted = employees.find((emp) => num(emp.deduction) > grossOf(emp));
    if (overDeducted) {
      setToast({
        type: "error",
        text: `Deduction for ${overDeducted.name || "an employee"} is more than the gross salary.`,
      });
      return;
    }

    // Mode and date of payment only apply to salaries that have been paid.
    const payload = {
      employees: employees.map(({ paymentMode, paymentDate, ...rest }) => ({
        ...rest,
        deduction: num(rest.deduction),
        deductionReason: num(rest.deduction) > 0 ? rest.deductionReason : "",
        ...(rest.paid ? { paymentMode, paymentDate } : {}),
      })),
      totalGross: totalGrossForm,
      totalDeduction: totalDeductionForm,
      totalSalary, // net payable
    };

    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
      const token = localStorage.getItem("webapptoken") || localStorage.getItem("token") || "";
      const response = await fetch(
        `${backendUrl}/api/report/salary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: token,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();
      fetchSalaryData();
      setToast({
        type: response.ok ? "success" : "error",
        text:
          result.message ||
          (response.ok
            ? "Salary report saved successfully."
            : "Could not save the salary report."),
      });
      if (response.ok) setEmployees([blankEmployee()]);
    } catch (error) {
      console.error(error);
      setToast({
        type: "error",
        text: "Error saving salary report. Please try again later.",
      });
    }
  };

  const startEdit = (emp) => {
    setEditId(emp._id);
    setUpdateStatus(!!emp.paid);
    setUpdateMode(emp.paymentMode || "");
    setUpdateDate(dateInputValue(emp.paymentDate));
    setUpdateDeduction(num(emp.deduction));
    setUpdateReason(emp.deductionReason || "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setUpdateStatus(null);
    setUpdateMode("");
    setUpdateDate("");
    setUpdateDeduction(0);
    setUpdateReason("");
  };

  const changeUpdateStatus = (paid) => {
    setUpdateStatus(paid);
    if (paid) setUpdateDate((d) => d || todayStr());
  };

  const startQuick = (key) => {
    setQuickKey(key);
    setQuickMode("");
    setQuickDate(todayStr());
  };

  const cancelQuick = () => {
    setQuickKey(null);
    setQuickMode("");
    setQuickDate("");
  };

  // `extra` carries optional fields (deduction, deductionReason) from the edit panel.
  const updatePaidStatus = async (entryId, empId, paid, mode, date, extra = {}) => {
    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
      const token = localStorage.getItem("webapptoken") || localStorage.getItem("token") || "";
      const response = await fetch(
        `${backendUrl}/api/report/salary/${entryId}/${empId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            token: token,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            paid,
            paymentMode: paid ? mode : "",
            paymentDate: paid ? date : null,
            ...extra,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        fetchSalaryData();
        setToast({
          type: "success",
          text: "Salary record updated.",
        });
      } else {
        setToast({
          type: "error",
          text: result.message || "Failed to update the salary record.",
        });
      }
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: "Failed to update the salary record." });
    } finally {
      cancelEdit();
      cancelQuick();
    }
  };

  const handleDownloadSlip = async (emp) => {
    setSlipBusy(emp._id);
    try {
      await downloadSlip(emp);
    } catch (err) {
      console.error("Slip generation failed:", err);
      setToast({ type: "error", text: "Could not create the salary slip. Please try again." });
    } finally {
      setSlipBusy(null);
    }
  };

  /* ---------------- Dashboard data (server already filtered by period) ---------------- */
  const rows = salaryData.flatMap((entry) =>
    (entry.employees || []).map((emp) => ({ ...emp, entryId: entry._id })),
  );

  const totalGross = sum(rows, grossOf);
  const totalDeductions = sum(rows, deductionOf);
  const totalFiltered = sum(rows, netSalaryOf); // net payroll
  const paidTotal = sum(rows.filter((r) => r.paid), netSalaryOf);
  const unpaidTotal = sum(rows.filter((r) => !r.paid), netSalaryOf);

  const paidCount = rows.filter((e) => e.paid).length;
  const unpaidCount = rows.length - paidCount;
  const deductionCount = rows.filter((r) => deductionOf(r) > 0).length;

  const paidShare = totalFiltered > 0 ? (paidTotal / totalFiltered) * 100 : 0;
  const unpaidShare = totalFiltered > 0 ? (unpaidTotal / totalFiltered) * 100 : 0;
  const paidPct = Math.round(paidShare);

  const avgSalary = rows.length ? totalFiltered / rows.length : 0;
  const topEarner = rows.reduce(
    (best, r) => (!best || netSalaryOf(r) > netSalaryOf(best) ? r : best),
    null,
  );

  const monthly = Object.values(
    rows.reduce((acc, r) => {
      const key = r.month || "Unknown";
      if (!acc[key]) acc[key] = { key, paid: 0, unpaid: 0, total: 0 };
      const v = netSalaryOf(r);
      if (r.paid) acc[key].paid += v;
      else acc[key].unpaid += v;
      acc[key].total += v;
      return acc;
    }, {}),
  )
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6);
  const maxMonth = Math.max(0, ...monthly.map((m) => m.total));

  const roleBreakdown = Object.values(
    rows.reduce((acc, r) => {
      const key = (r.role || "").trim() || "No role";
      if (!acc[key]) acc[key] = { role: key, count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += netSalaryOf(r);
      return acc;
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxRole = Math.max(0, ...roleBreakdown.map((r) => r.total));

  const outstanding = rows
    .filter((r) => !r.paid)
    .sort((a, b) => netSalaryOf(b) - netSalaryOf(a));

  const monthName = MONTHS.find(
    (m) => String(m.value) === String(selectedMonth),
  )?.label;
  const periodLabel =
    selectedMonth && selectedYear
      ? `${monthName} ${selectedYear}`
      : !selectedMonth && selectedYear
        ? `Year ${selectedYear}`
        : selectedMonth && !selectedYear
          ? `${monthName}, all years`
          : "All time";

  const downloadSalaryExcel = () => {
    const excelRows = salaryData.flatMap((entry) =>
      (entry.employees || []).map((emp, index) => ({
        Date:
          index === 0
            ? new Date(entry.createdAt).toLocaleDateString("en-IN")
            : "",
        Name: emp.name,
        Role: emp.role,
        Month: emp.month,
        "Gross Salary": grossOf(emp),
        Deduction: deductionOf(emp),
        "Deduction Reason": emp.deductionReason || "-",
        "Net Salary": netSalaryOf(emp),
        Status: emp.paid ? "Paid" : "Unpaid",
        "Payment Mode": emp.paymentMode || "-",
        "Salary Date": emp.paymentDate
          ? new Date(emp.paymentDate).toLocaleDateString("en-IN")
          : "-",
        "Entry Net Total":
          index === 0 ? sum(entry.employees || [], netSalaryOf) : "",
      })),
    );

    exportToExcel({
      data: excelRows,
      fileName: `Salary_Report_${selectedMonth || "All"}_${selectedYear || "All"}`,
      sheetName: "Salary",
    });
  };

  return (
    <div className="space-y-6">
      {/* ================= TOAST ================= */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-6 top-6 z-50 flex max-w-sm items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {toast.type === "success" ? (
            <MdCheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          ) : (
            <MdErrorOutline size={18} className="mt-0.5 shrink-0 text-rose-600" />
          )}
          <p className="flex-1">{toast.text}</p>
          <button
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
            className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Salary
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {periodLabel}
            <span className="mx-2 text-slate-300">|</span>
            {salaryData.length} {salaryData.length === 1 ? "sheet" : "sheets"},{" "}
            {rows.length} {rows.length === 1 ? "employee" : "employees"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadSalaryExcel} className={BTN_OUTLINE}>
            <MdFileDownload size={18} className="text-slate-500" />
            Excel
          </button>
          {/* SalaryReportPdf renders its own download control */}
          <SalaryReportPdf
            filteredEntries={salaryData}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            totalFiltered={totalFiltered}
            paidTotal={paidTotal}
            unpaidTotal={unpaidTotal}
          />
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <p className="px-1 text-sm font-medium text-slate-600 sm:mr-2">Period</p>
        <select
          aria-label="Filter by month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={SELECT}
        >
          <option value="">All months</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className={SELECT}
        >
          <option value="">All years</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {selectedYear && !selectedMonth && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm">
          <span className="font-semibold text-blue-950">
            {selectedYear} annual payroll summary
          </span>
          <span className="text-blue-800">
            Showing all salary months in {selectedYear}; use the Excel/PDF export
            for the annual report.
          </span>
        </div>
      )}

      {/* ================= OVERVIEW (the one bold element) ================= */}
      <section
        aria-label="Payroll overview"
        className="rounded-2xl bg-gradient-to-br from-[#17458f] via-[#102f6b] to-[#0a1f4d] p-6 text-white shadow-sm ring-1 ring-blue-950/40 sm:p-8"
      >
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-2">
            <p className="text-sm text-cyan-200/90">Net payroll</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              ₹{formatINR(totalFiltered)}
            </p>
            <p className="mt-3 text-sm text-blue-100/80">
              <span className="font-semibold text-emerald-300">
                {paidPct}% paid
              </span>{" "}
              (₹{formatINR(paidTotal)} of ₹{formatINR(totalFiltered)})
            </p>

            {/* Gross -> deductions -> net */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/5 px-3 py-2 text-sm tabular-nums ring-1 ring-inset ring-white/10">
              <span className="text-blue-100/80">
                Gross ₹{formatINR(totalGross)}
              </span>
              <span className="text-blue-200/50">-</span>
              <span className="text-amber-300">
                Deductions ₹{formatINR(totalDeductions)}
              </span>
              <span className="text-blue-200/50">=</span>
              <span className="font-semibold">Net ₹{formatINR(totalFiltered)}</span>
            </div>

            <div
              className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-white/10"
              role="img"
              aria-label={`Paid ${paidPct}%, unpaid ${Math.round(unpaidShare)}%`}
            >
              <div
                className={`${STATUS.Paid.bar} h-full transition-all duration-500 motion-reduce:transition-none`}
                style={{ width: `${paidShare}%` }}
              />
              <div
                className={`${STATUS.Unpaid.bar} h-full transition-all duration-500 motion-reduce:transition-none`}
                style={{ width: `${unpaidShare}%` }}
              />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="flex items-center gap-2 text-sm text-blue-100/80">
                  <span className={`h-2 w-2 rounded-full ${STATUS.Paid.dot}`} />
                  Paid
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  ₹{formatINR(paidTotal)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-sm text-blue-100/80">
                  <span className={`h-2 w-2 rounded-full ${STATUS.Unpaid.dot}`} />
                  Unpaid
                </dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  ₹{formatINR(unpaidTotal)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-blue-100">
                Net payroll by pay month
              </h2>
              <div className="flex items-center gap-4 text-xs text-blue-200/80">
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${STATUS.Paid.dot}`} />
                  Paid
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${STATUS.Unpaid.dot}`} />
                  Unpaid
                </span>
              </div>
            </div>

            {monthly.length === 0 ? (
              <p className="mt-10 text-center text-sm text-blue-200/70">
                No payroll data for this period.
              </p>
            ) : (
              <div className="mt-6 flex h-48 items-end gap-3 border-b border-white/10">
                {monthly.map((m) => {
                  const h = maxMonth > 0 ? (m.total / maxMonth) * 100 : 0;
                  return (
                    <div
                      key={m.key}
                      title={`${formatMonth(m.key)}: paid ₹${formatINR(
                        m.paid,
                      )}, unpaid ₹${formatINR(m.unpaid)}`}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="text-xs tabular-nums text-blue-100/80">
                        ₹{compact(m.total)}
                      </span>
                      <div
                        className="flex w-full max-w-[3.5rem] flex-col-reverse overflow-hidden rounded-t-md"
                        style={{
                          height: `${h * 0.72}%`,
                          minHeight: m.total > 0 ? 4 : 0,
                        }}
                      >
                        <div
                          className="bg-emerald-400"
                          style={{
                            height: `${m.total ? (m.paid / m.total) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="bg-rose-400"
                          style={{
                            height: `${m.total ? (m.unpaid / m.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {monthly.length > 0 && (
              <div className="mt-2 flex gap-3">
                {monthly.map((m) => (
                  <span
                    key={m.key}
                    className="flex-1 text-center text-xs text-blue-200/70"
                  >
                    {chartLabel(m.key)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= KPI CARDS ================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<MdPayments size={22} />}
          tone="emerald"
          label="Paid out"
          value={`₹${formatINR(paidTotal)}`}
          hint={`${paidCount} ${paidCount === 1 ? "payment" : "payments"} completed`}
        />
        <Kpi
          icon={<MdPendingActions size={22} />}
          tone="rose"
          label="Outstanding"
          value={`₹${formatINR(unpaidTotal)}`}
          hint={
            unpaidCount === 0
              ? "Nothing pending"
              : `${unpaidCount} ${unpaidCount === 1 ? "payment" : "payments"} pending`
          }
        />
        <Kpi
          icon={<MdRemoveCircleOutline size={22} />}
          tone="amber"
          label="Total deductions"
          value={`₹${formatINR(totalDeductions)}`}
          hint={
            deductionCount === 0
              ? "No deductions in this period"
              : `Applied to ${deductionCount} ${deductionCount === 1 ? "employee" : "employees"}`
          }
        />
        <Kpi
          icon={<MdTrendingUp size={22} />}
          tone="cyan"
          label="Average net salary"
          value={`₹${formatINR(avgSalary)}`}
          hint={
            topEarner
              ? `Highest: ₹${formatINR(netSalaryOf(topEarner))} (${topEarner.name})`
              : "No data yet"
          }
        />
      </div>

      {/* ================= BREAKDOWN ================= */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="Payroll by role"
          description="Top roles by net salary in this period."
        >
          <div className="space-y-4 px-6 py-5">
            {roleBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No data available.
              </p>
            ) : (
              roleBreakdown.map((r) => (
                <div key={r.role}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <p className="truncate font-medium text-slate-900">
                      {r.role}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {r.count} {r.count === 1 ? "employee" : "employees"}
                      </span>
                    </p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      ₹{formatINR(r.total)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-700 to-cyan-400"
                      style={{
                        width: `${maxRole > 0 ? (r.total / maxRole) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Pending payments"
          description={
            outstanding.length === 0
              ? "Everything in this period has been paid."
              : `${outstanding.length} unpaid, largest first.`
          }
        >
          {outstanding.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-sm text-slate-500">
              <MdTaskAlt size={32} className="text-emerald-500" />
              All salaries are paid.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {outstanding.slice(0, 5).map((r) => {
                const key = `${r.entryId}-${r._id}`;
                const open = quickKey === key;
                return (
                  <li key={key} className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Initial name={r.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {r.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {r.role || "No role"}, {formatMonth(r.month)}
                          {deductionOf(r) > 0 &&
                            `, after ₹${formatINR(deductionOf(r))} deduction`}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        ₹{formatINR(netSalaryOf(r))}
                      </p>
                      <button
                        onClick={() => (open ? cancelQuick() : startQuick(key))}
                        aria-expanded={open}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
                      >
                        {open ? "Cancel" : "Mark paid"}
                      </button>
                    </div>

                    {open && (
                      <div className="mt-3 flex flex-col gap-3 rounded-lg bg-slate-50/70 p-3 ring-1 ring-inset ring-slate-100 sm:flex-row sm:items-end">
                        <div className="sm:w-44">
                          <Label htmlFor={`quick-mode-${key}`}>Payment mode</Label>
                          <select
                            id={`quick-mode-${key}`}
                            value={quickMode}
                            onChange={(e) => setQuickMode(e.target.value)}
                            className={FIELD}
                          >
                            <option value="">Select mode</option>
                            {PAYMENT_MODES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:w-44">
                          <Label htmlFor={`quick-date-${key}`}>Salary date</Label>
                          <input
                            id={`quick-date-${key}`}
                            type="date"
                            max={todayStr()}
                            value={quickDate}
                            onChange={(e) => setQuickDate(e.target.value)}
                            className={FIELD}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!quickMode || !quickDate}
                          onClick={() =>
                            updatePaidStatus(
                              r.entryId,
                              r._id,
                              true,
                              quickMode,
                              quickDate,
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none sm:ml-auto"
                        >
                          <MdCheck size={16} />
                          Confirm payment
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {outstanding.length > 5 && (
                <li className="px-6 py-3 text-center text-xs text-slate-500">
                  and {outstanding.length - 5} more in the salary sheets below
                </li>
              )}
            </ul>
          )}
        </Panel>
      </div>

      {/* ================= ADD SALARY SHEET ================= */}
      <Panel
        title="Add salary sheet"
        description="Pick an existing employee or type a name, then enter the gross salary and any deduction."
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {/* Column headings (desktop only) */}
            <div
              className={`mb-2 hidden gap-3 px-1 text-xs font-medium text-slate-500 xl:grid ${FORM_GRID}`}
            >
              <span>Employee name</span>
              <span>Role</span>
              <span>Pay month</span>
              <span>Gross salary</span>
              <span>Deduction</span>
              <span>Status</span>
              <span />
            </div>

            <div className="space-y-4 lg:space-y-3">
              {employees.map((emp, idx) => {
                const options =
                  activeDropdown === idx ? filteredEmployeeOptions(emp.name) : [];
                const tooMuch = num(emp.deduction) > grossOf(emp);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 p-4 xl:p-3"
                  >
                    <div
                      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:items-center ${FORM_GRID}`}
                    >
                      <div className="relative sm:col-span-2 xl:col-span-1">
                        <FieldLabel htmlFor={`name-${idx}`}>Employee name</FieldLabel>
                        <input
                          id={`name-${idx}`}
                          type="text"
                          autoComplete="off"
                          value={emp.name}
                          onChange={(e) => {
                            handleChange(idx, "name", e.target.value);
                            setActiveDropdown(idx);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={() => setActiveDropdown(idx)}
                          placeholder="Employee name"
                          className={FIELD}
                        />

                        {activeDropdown === idx && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute z-20 mt-1.5 max-h-56 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                          >
                            {options.map((employee) => (
                              <button
                                type="button"
                                key={employee._id}
                                onClick={() => handleEmployeeSelect(idx, employee)}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                              >
                                <Initial name={employee?.personalDetails?.fullName} />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-slate-900">
                                    {employee?.personalDetails?.fullName}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {employee?.personalDetails?.qualification ||
                                      "No qualification"}
                                  </span>
                                </span>
                              </button>
                            ))}

                            {options.length === 0 && (
                              <p className="px-3 py-3 text-sm text-slate-500">
                                No employee found. You can keep typing to add a
                                new name.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <FieldLabel htmlFor={`role-${idx}`}>Role</FieldLabel>
                        <input
                          id={`role-${idx}`}
                          type="text"
                          value={emp.role}
                          onChange={(e) => handleChange(idx, "role", e.target.value)}
                          placeholder="e.g. Therapist"
                          className={FIELD}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor={`month-${idx}`}>Pay month</FieldLabel>
                        <input
                          id={`month-${idx}`}
                          type="month"
                          value={emp.month}
                          onChange={(e) => handleChange(idx, "month", e.target.value)}
                          className={`${FIELD} px-3`}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor={`salary-${idx}`}>Gross salary</FieldLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
                            ₹
                          </span>
                          <input
                            id={`salary-${idx}`}
                            type="number"
                            min={0}
                            value={emp.salary}
                            onChange={(e) =>
                              handleChange(idx, "salary", e.target.value)
                            }
                            className={`${FIELD} pl-8 tabular-nums`}
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel htmlFor={`deduction-${idx}`}>Deduction</FieldLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
                            ₹
                          </span>
                          <input
                            id={`deduction-${idx}`}
                            type="number"
                            min={0}
                            value={emp.deduction}
                            onChange={(e) =>
                              handleChange(idx, "deduction", e.target.value)
                            }
                            aria-invalid={tooMuch}
                            className={`${FIELD} pl-8 tabular-nums ${
                              tooMuch
                                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                                : ""
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel htmlFor={`paid-${idx}`}>Status</FieldLabel>
                        <select
                          id={`paid-${idx}`}
                          value={emp.paid ? "true" : "false"}
                          onChange={(e) => handleChange(idx, "paid", e.target.value)}
                          className={FIELD}
                        >
                          <option value="false">Unpaid</option>
                          <option value="true">Paid</option>
                        </select>
                      </div>

                      <div className="flex justify-end sm:col-span-2 xl:col-span-1">
                        <button
                          type="button"
                          aria-label={`Remove employee row ${idx + 1}`}
                          disabled={employees.length === 1}
                          onClick={() => removeEmployee(idx)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        >
                          <MdDeleteOutline size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Deduction reason + live net pay */}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                      {num(emp.deduction) > 0 && (
                        <div className="sm:flex-1">
                          <Label htmlFor={`reason-${idx}`}>Reason for deduction</Label>
                          <input
                            id={`reason-${idx}`}
                            type="text"
                            required
                            value={emp.deductionReason}
                            onChange={(e) =>
                              handleChange(idx, "deductionReason", e.target.value)
                            }
                            placeholder="e.g. Unpaid leave, advance recovery, TDS"
                            className={FIELD}
                          />
                        </div>
                      )}
                      <div className="text-sm sm:ml-auto sm:text-right">
                        {tooMuch ? (
                          <p className="font-medium text-rose-600">
                            Deduction is more than the gross salary.
                          </p>
                        ) : (
                          <p className="text-slate-500">
                            Net pay{" "}
                            <span className="text-base font-semibold tabular-nums text-slate-900">
                              ₹{formatINR(netSalaryOf(emp))}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {emp.paid && (
                      <div className="mt-3 flex flex-col gap-3 rounded-lg bg-slate-50/70 p-3 ring-1 ring-inset ring-slate-100 sm:flex-row sm:items-end">
                        <div className="sm:w-48">
                          <Label htmlFor={`mode-${idx}`}>Payment mode</Label>
                          <select
                            id={`mode-${idx}`}
                            value={emp.paymentMode}
                            onChange={(e) =>
                              handleChange(idx, "paymentMode", e.target.value)
                            }
                            required
                            className={FIELD}
                          >
                            <option value="">Select mode</option>
                            {PAYMENT_MODES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:w-48">
                          <Label htmlFor={`paydate-${idx}`}>Salary date</Label>
                          <input
                            id={`paydate-${idx}`}
                            type="date"
                            max={todayStr()}
                            value={emp.paymentDate}
                            onChange={(e) =>
                              handleChange(idx, "paymentDate", e.target.value)
                            }
                            required
                            className={FIELD}
                          />
                        </div>
                        <p className="text-xs text-slate-500 sm:pb-3">
                          The date this salary was paid.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={addEmployee} className={`${BTN_GHOST} mt-4`}>
              <MdAdd size={18} />
              Add employee
            </button>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-slate-600">
              <div className="flex items-baseline gap-1.5">
                <dt>
                  {employees.length} {employees.length === 1 ? "employee" : "employees"}, gross
                </dt>
                <dd className="font-semibold tabular-nums text-slate-900">
                  ₹{formatINR(totalGrossForm)}
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt>deductions</dt>
                <dd className="font-semibold tabular-nums text-amber-700">
                  ₹{formatINR(totalDeductionForm)}
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt>net payable</dt>
                <dd className="text-lg font-semibold tabular-nums text-slate-900">
                  ₹{formatINR(totalSalary)}
                </dd>
              </div>
            </dl>
            <button type="submit" className={BTN_PRIMARY}>
              Save salary sheet
            </button>
          </div>
        </form>
      </Panel>

      {/* ================= SALARY SHEETS ================= */}
      {loading ? (
        <Panel title="Salary sheets">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <SkeletonRows rows={4} cols={4} />
              </tbody>
            </table>
          </div>
        </Panel>
      ) : error ? (
        <Panel>
          <p className="px-6 py-14 text-center text-sm text-rose-600">{error}</p>
        </Panel>
      ) : salaryData.length === 0 ? (
        <Panel>
          <p className="px-6 py-14 text-center text-sm text-slate-500">
            No salary records for this period. Add a salary sheet using the form
            above.
          </p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {salaryData.map((entry) => {
            const entryEmployees = entry.employees || [];
            const entryPaid = entryEmployees.filter((e) => e.paid).length;
            const entryGross = sum(entryEmployees, grossOf);
            const entryDeduction = sum(entryEmployees, deductionOf);
            const entryNet = sum(entryEmployees, netSalaryOf);
            return (
              <Panel
                key={entry._id}
                title={`Salary sheet, ${formatDate(entry.createdAt)}`}
                description={`${entryEmployees.length} ${
                  entryEmployees.length === 1 ? "employee" : "employees"
                }, ${entryPaid} paid`}
                aside={
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Net payable</p>
                    <p className="text-lg font-semibold tabular-nums text-slate-900">
                      ₹{formatINR(entryNet)}
                    </p>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-medium text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">Pay month</th>
                        <th className="px-6 py-3 text-right">Gross</th>
                        <th className="px-6 py-3 text-right">Deduction</th>
                        <th className="px-6 py-3 text-right">Net pay</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Payment</th>
                        <th className="px-6 py-3 text-right">Salary slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entryEmployees.map((emp) => {
                        const isEditing = editId === emp._id;
                        const hasPaymentInfo =
                          emp.paid && (emp.paymentMode || emp.paymentDate);
                        const deduction = deductionOf(emp);

                        const isPaidEdit = updateStatus === true;
                        const deductionInvalid =
                          updateDeduction > grossOf(emp) ||
                          (updateDeduction > 0 && !updateReason.trim());
                        const incomplete =
                          deductionInvalid ||
                          (isPaidEdit && (!updateMode || !updateDate));
                        const unchanged =
                          updateStatus === !!emp.paid &&
                          updateDeduction === num(emp.deduction) &&
                          (updateDeduction > 0
                            ? updateReason === (emp.deductionReason || "")
                            : true) &&
                          (!isPaidEdit ||
                            (updateMode === (emp.paymentMode || "") &&
                              updateDate === dateInputValue(emp.paymentDate)));

                        return (
                          <Fragment key={emp._id}>
                            <tr
                              className={`transition-colors hover:bg-slate-50/70 ${
                                isEditing ? "bg-slate-50/70" : ""
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Initial name={emp.name} />
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-900">
                                      {emp.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {emp.role || "No role"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                                {formatMonth(emp.month)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right tabular-nums text-slate-700">
                                ₹{formatINR(grossOf(emp))}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right">
                                {deduction > 0 ? (
                                  <div>
                                    <p className="font-medium tabular-nums text-rose-600">
                                      -₹{formatINR(deduction)}
                                    </p>
                                    {emp.deductionReason && (
                                      <p
                                        className="max-w-[10rem] truncate text-xs text-slate-500"
                                        title={emp.deductionReason}
                                      >
                                        {emp.deductionReason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right font-semibold tabular-nums text-slate-900">
                                ₹{formatINR(netSalaryOf(emp))}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <StatusPill paid={emp.paid} />
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                {hasPaymentInfo ? (
                                  <div>
                                    <p className="font-medium text-slate-800">
                                      {emp.paymentMode || "-"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatPayDate(emp.paymentDate)}
                                    </p>
                                  </div>
                                ) : emp.paid ? (
                                  <span className="text-xs text-slate-400">
                                    Not recorded
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadSlip(emp)}
                                    disabled={slipBusy === emp._id}
                                    title={`Download ${emp.name}'s salary slip (PDF)`}
                                    aria-label={`Download salary slip for ${emp.name}`}
                                    className={BTN_SLIP}
                                  >
                                    <MdPictureAsPdf size={16} />
                                    {slipBusy === emp._id ? "Preparing" : "PDF"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareSalaryOnWhatsApp(emp)}
                                    title={`Share ${emp.name}'s salary on WhatsApp`}
                                    aria-label={`Share ${emp.name} salary on WhatsApp`}
                                    className={BTN_WHATSAPP}
                                  >
                                    <  FaWhatsapp size={16} />
                                    Share
                                  </button>
                                  <button
                                    aria-label={
                                      isEditing ? "Cancel editing" : "Edit salary record"
                                    }
                                    title={isEditing ? "Cancel editing" : "Edit deduction or payment"}
                                    onClick={() =>
                                      isEditing ? cancelEdit() : startEdit(emp)
                                    }
                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
                                  >
                                    {isEditing ? (
                                      <MdClose size={18} />
                                    ) : (
                                      <MdEdit size={18} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isEditing && (
                              <tr className="bg-slate-50/70">
                                <td colSpan={8} className="px-6 pb-5 pt-1">
                                  <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:flex-wrap lg:items-end">
                                    <div className="lg:w-40">
                                      <Label htmlFor={`edit-status-${emp._id}`}>
                                        Status
                                      </Label>
                                      <select
                                        id={`edit-status-${emp._id}`}
                                        value={updateStatus ? "true" : "false"}
                                        onChange={(e) =>
                                          changeUpdateStatus(
                                            e.target.value === "true",
                                          )
                                        }
                                        className={FIELD}
                                      >
                                        <option value="true">Paid</option>
                                        <option value="false">Unpaid</option>
                                      </select>
                                    </div>

                                    <div className="lg:w-40">
                                      <Label htmlFor={`edit-deduction-${emp._id}`}>
                                        Deduction
                                      </Label>
                                      <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
                                          ₹
                                        </span>
                                        <input
                                          id={`edit-deduction-${emp._id}`}
                                          type="number"
                                          min={0}
                                          max={grossOf(emp)}
                                          value={updateDeduction}
                                          onChange={(e) => {
                                            const v = Math.max(0, Number(e.target.value) || 0);
                                            setUpdateDeduction(v);
                                            if (v === 0) setUpdateReason("");
                                          }}
                                          className={`${FIELD} pl-8 tabular-nums`}
                                        />
                                      </div>
                                    </div>

                                    {updateDeduction > 0 && (
                                      <div className="lg:w-64">
                                        <Label htmlFor={`edit-reason-${emp._id}`}>
                                          Reason for deduction
                                        </Label>
                                        <input
                                          id={`edit-reason-${emp._id}`}
                                          type="text"
                                          value={updateReason}
                                          onChange={(e) => setUpdateReason(e.target.value)}
                                          placeholder="e.g. Unpaid leave"
                                          className={FIELD}
                                        />
                                      </div>
                                    )}

                                    {isPaidEdit && (
                                      <>
                                        <div className="lg:w-44">
                                          <Label htmlFor={`edit-mode-${emp._id}`}>
                                            Payment mode
                                          </Label>
                                          <select
                                            id={`edit-mode-${emp._id}`}
                                            value={updateMode}
                                            onChange={(e) =>
                                              setUpdateMode(e.target.value)
                                            }
                                            className={FIELD}
                                          >
                                            <option value="">Select mode</option>
                                            {PAYMENT_MODES.map((m) => (
                                              <option key={m} value={m}>
                                                {m}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="lg:w-44">
                                          <Label htmlFor={`edit-date-${emp._id}`}>
                                            Salary date
                                          </Label>
                                          <input
                                            id={`edit-date-${emp._id}`}
                                            type="date"
                                            max={todayStr()}
                                            value={updateDate}
                                            onChange={(e) =>
                                              setUpdateDate(e.target.value)
                                            }
                                            className={FIELD}
                                          />
                                        </div>
                                      </>
                                    )}

                                    <div className="flex gap-2 lg:ml-auto">
                                      <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className={BTN_OUTLINE}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={incomplete || unchanged}
                                        onClick={() =>
                                          updatePaidStatus(
                                            entry._id,
                                            emp._id,
                                            updateStatus,
                                            updateMode,
                                            updateDate,
                                            {
                                              deduction: updateDeduction,
                                              deductionReason:
                                                updateDeduction > 0 ? updateReason.trim() : "",
                                            },
                                          )
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                                      >
                                        <MdCheck size={16} />
                                        Save changes
                                      </button>
                                    </div>
                                  </div>
                                  {incomplete && (
                                    <p className="mt-2 text-xs text-slate-500">
                                      {updateDeduction > grossOf(emp)
                                        ? "The deduction cannot be more than the gross salary."
                                        : updateDeduction > 0 && !updateReason.trim()
                                          ? "Add a reason for the deduction."
                                          : "Choose the payment mode and salary date to mark this salary as paid."}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50/70">
                      <tr>
                        <td
                          colSpan={2}
                          className="px-6 py-3.5 text-right font-medium text-slate-600"
                        >
                          Total
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium tabular-nums text-slate-700">
                          ₹{formatINR(entryGross)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-medium tabular-nums text-rose-600">
                          {entryDeduction > 0 ? `-₹${formatINR(entryDeduction)}` : "-"}
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                          ₹{formatINR(entryNet)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Salary;

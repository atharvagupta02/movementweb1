
import { useState } from "react";

const EMPTY = {
  patientName: "",
  gender: "",
  age: "",
  address: "",
  chiefComplaint: "",
  contactNumber: "",
  email: "",
};

const GENDERS = ["Male", "Female", "Other"];

const validate = (f) => {
  const e = {};

  if (!f.patientName.trim()) e.patientName = "Enter the patient's name";
  if (!f.gender) e.gender = "Select a gender";

  const age = Number(f.age);
  if (f.age === "") e.age = "Enter the age";
  else if (!(age > 0 && age <= 120))
    e.age = "Age must be between 1 and 120";

  if (!f.address.trim()) e.address = "Enter the patient's address";

  if (!f.chiefComplaint.trim())
    e.chiefComplaint = "Enter the chief complaint";

  if (!f.contactNumber) e.contactNumber = "Enter the contact number";
  else if (!/^[0-9]{10}$/.test(f.contactNumber))
    e.contactNumber = "Enter a 10-digit mobile number";

  if (
    f.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)
  ) {
    e.email = "Enter a valid email address";
  }

  return e;
};

const inputClass = (error) =>
  `w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-slate-800 placeholder-slate-400 outline-none transition focus:ring-4 ${
    error
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-300 hover:border-slate-400 focus:border-[#0B4BAA] focus:ring-[#00C2CB]/20"
  }`;

const Field = ({ label, id, required, error, hint, children }) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-700"
    >
      {label}
      {required && <span className="text-rose-500">*</span>}
    </label>

    {children}

    {error ? (
      <p className="mt-1.5 text-[13px] font-medium text-rose-600" role="alert">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1.5 text-[13px] text-slate-400">{hint}</p>
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <div className="mb-4 flex items-center gap-3">
    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#0B4BAA]">
      {children}
    </h3>
    <span className="h-px flex-1 bg-slate-200" />
  </div>
);

const EnquiryForm = () => {
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "contactNumber") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    const msg = validate(formData)[name];

    setErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const setGender = (g) => {
    setFormData((prev) => ({ ...prev, gender: g }));

    if (errors.gender) {
      setErrors((prev) => ({ ...prev, gender: undefined }));
    }
  };

  const handleClear = () => {
    setFormData({ ...EMPTY });
    setErrors({});
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const errs = validate(formData);
    setErrors(errs);

    if (Object.keys(errs).length) {
      setStatus({
        type: "error",
        text: "Please fix the highlighted fields.",
      });
      return;
    }

    if (!backendURL) {
      setStatus({
        type: "error",
        text: "Backend URL is not configured.",
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(
        `${backendURL}/api/enquiry/createEnquiry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            patientName: formData.patientName.trim(),
            address: formData.address.trim(),
            chiefComplaint: formData.chiefComplaint.trim(),
            email: formData.email.trim(),
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result?.success) {
        setStatus({
          type: "success",
          text: result.message || "Enquiry added successfully.",
        });

        setFormData({ ...EMPTY });
        setErrors({});
      } else {
        setStatus({
          type: "error",
          text: result?.message || "Could not add the enquiry. Please try again.",
        });
      }
    } catch (error) {
      console.error(error);

      setStatus({
        type: "error",
        text: "Could not reach the server. Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">

        <div className="h-1.5 bg-gradient-to-r from-[#00C2CB] via-[#0B4BAA] to-[#082F6B]" />

        {/* Header */}
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-6 sm:px-8">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0B4BAA] to-[#082F6B] text-white shadow-md">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Add Enquiry
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Enter the patient's details and medical complaint.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="px-6 py-6 sm:px-8"
        >
          {/* Status */}
          {status && (
            <div
              role={status.type === "error" ? "alert" : "status"}
              className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-800"
              }`}
            >
              {status.text}
            </div>
          )}

          <SectionTitle>Patient details</SectionTitle>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Patient Name"
              id="patientName"
              required
              error={errors.patientName}
            >
              <input
                id="patientName"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Full name"
                className={inputClass(errors.patientName)}
              />
            </Field>

            <Field label="Gender" id="gender" required error={errors.gender}>
              <div
                className={`grid grid-cols-3 gap-1 rounded-xl border p-1 ${
                  errors.gender
                    ? "border-rose-400"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-lg py-2 text-sm font-semibold transition ${
                      formData.gender === g
                        ? "bg-[#0B4BAA] text-white"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Age" id="age" required error={errors.age}>
              <input
                id="age"
                name="age"
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Age in years"
                className={inputClass(errors.age)}
              />
            </Field>

            <Field label="Contact Number" id="contactNumber" required error={errors.contactNumber}>
              <div className="flex">
                <span className="grid place-items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                  +91
                </span>

                <input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="98765 43210"
                  className={`${inputClass(errors.contactNumber)} rounded-l-none`}
                />
              </div>
            </Field>
          </div>

          {/* Address */}
          <div className="mt-6">
            <SectionTitle>Address</SectionTitle>

            <Field
              label="Patient Address"
              id="address"
              required
              error={errors.address}
              hint="Enter house number, area, city, etc."
            >
              <textarea
                id="address"
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter complete address"
                className={inputClass(errors.address)}
              />
            </Field>
          </div>

          {/* Chief Complaint */}
          <div className="mt-6">
            <SectionTitle>Medical details</SectionTitle>

            <Field
              label="Chief Complaint"
              id="chiefComplaint"
              required
              error={errors.chiefComplaint}
              hint="Describe the patient's main problem or reason for visiting."
            >
              <textarea
                id="chiefComplaint"
                name="chiefComplaint"
                rows={4}
                value={formData.chiefComplaint}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Lower back pain for 2 weeks, knee pain, neck stiffness..."
                className={inputClass(errors.chiefComplaint)}
              />
            </Field>
          </div>

          {/* Email */}
          <div className="mt-6">
            <SectionTitle>Contact details</SectionTitle>

            <Field
              label="Email"
              id="email"
              error={errors.email}
              hint="Optional"
            >
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="name@example.com"
                className={inputClass(errors.email)}
              />
            </Field>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-400">
              <span className="text-rose-500">*</span> Required fields
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-[#0B4BAA] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#093d8c] disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
              >
                {loading ? "Adding..." : "+ Add Enquiry"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnquiryForm;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useRecruiterProfile } from "../../hooks/useProfiles";
import { formatDate } from "../../utils/format";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import {
  GraduationCap,
  Users,
  Calendar,
  Award,
  Star,
  Sparkles,
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

const STATUS_BADGE = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-error",
  CANCELLED: "badge-error",
};
const STATUS_ICON = {
  PENDING: <Clock className="w-4 h-4" />,
  APPROVED: <CheckCircle className="w-4 h-4" />,
  REJECTED: <XCircle className="w-4 h-4" />,
  CANCELLED: <XCircle className="w-4 h-4" />,
};
const STATUS_LABEL = {
  PENDING: "Pending Admin Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const Section = ({ title, icon: Icon, children, badge }) => (
  <div className="card bg-base-100 border border-base-200 overflow-hidden">
    <div className="card-body px-6 py-4 border-b border-base-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-base-content">{title}</h2>
          {badge && <p className="text-xs text-base-content/60">{badge}</p>}
        </div>
      </div>
    </div>
    <div className="card-body px-6 py-5">{children}</div>
  </div>
);

const InputWrapper = ({ label, required, children, error, helper }) => (
  <div className="flex flex-col gap-1.5">
    <label className="label text-sm font-medium text-base-content">
      <span className="label-text">{label}</span>
      {required && <span className="label-text-alt text-error ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-error flex items-center gap-1">
        ✕ {error.message}
      </p>
    )}
    {helper && !error && (
      <p className="text-xs text-base-content/50">{helper}</p>
    )}
  </div>
);

const StatusCard = ({ status, createdAt, eligibility }) => {
  const Icon = STATUS_ICON[status] || <Clock className="w-4 h-4" />;
  const badgeClass = STATUS_BADGE[status] || "badge-ghost";
  const label = STATUS_LABEL[status] || status;
  const e = eligibility ?? {};

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {Icon}
          </div>
          <div>
            <span className={`badge badge-lg ${badgeClass}`}>{label}</span>
            <p className="mt-1 text-xs text-base-content/50">
              Requested {formatDate(createdAt)}
            </p>
          </div>
        </div>
        <span className="badge badge-primary badge-sm">
          {formatDate(createdAt, "MMM d, yyyy")}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {e.department && (
          <span className="badge badge-primary">
            <GraduationCap className="w-3 h-3 mr-1" />
            {e.department}
          </span>
        )}
        {(e.session ?? e.batch) && (
          <span className="badge badge-secondary">
            <Users className="w-3 h-3 mr-1" />
            Session: {e.session ?? e.batch}
          </span>
        )}{" "}
        {e.min_cgpa != null && (
          <span className="badge badge-accent">
            <Award className="w-3 h-3 mr-1" />
            CGPA ≥ {Number(e.min_cgpa).toFixed(2)}
          </span>
        )}
        {e.graduation_year && (
          <span className="badge badge-info">
            <Calendar className="w-3 h-3 mr-1" />
            Class of {e.graduation_year}
          </span>
        )}
        {(e.skills ?? []).map((s) => (
          <span key={s} className="badge badge-ghost">
            <Star className="w-3 h-3 mr-1" />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function CampusRecruitmentPage() {
  const { session } = useAuth();
  const { recruiter, company, loading } = useRecruiterProfile();
  const [requests, setRequests] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      department: "",
      session: "",
      min_cgpa: "",
      skills: "",
      graduation_year: "",
    },
  });

  useEffect(() => {
    if (!recruiter?.company_id) {
      setListLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("campus_recruitment")
      .select("*")
      .eq("company_id", recruiter.company_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) {
          setRequests(data ?? []);
          setListLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [recruiter?.company_id]);

  if (loading) return <LoadingScreen />;

  async function onSubmit(values) {
    setMessage(null);
    const eligibility = {
      department: values.department || null,
      session: values.session || null,
      min_cgpa: values.min_cgpa ? Number(values.min_cgpa) : null,
      skills: values.skills
        ? values.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        : [],
      graduation_year: values.graduation_year
        ? Number(values.graduation_year)
        : null,
    };
    const { error } = await supabase.from("campus_recruitment").insert({
      company_id: recruiter.company_id,
      requested_by: session.user.id,
      status: "PENDING",
      eligibility,
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    reset();
    setMessage({
      type: "success",
      text: "Campus recruitment request submitted for admin approval.",
    });
    const { data } = await supabase
      .from("campus_recruitment")
      .select("*")
      .eq("company_id", recruiter.company_id)
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/recruiter/dashboard"
            className="link link-primary text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="mt-1 text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="text-primary" />
            Campus Recruitment
          </h1>
          <p className="mt-1 text-base-content/70">
            Request on-campus recruitment drives and define student eligibility
            criteria.
          </p>
        </div>
        {company && (
          <span
            className={`badge badge-lg ${company.verification_status === "VERIFIED" ? "badge-success" : "badge-warning"}`}
          >
            {company.verification_status === "VERIFIED" ? (
              <>
                <Shield className="w-4 h-4 mr-1" />
                Verified
              </>
            ) : (
              <>
                <span className="loading loading-spinner loading-xs mr-1" />
                Pending Verification
              </>
            )}
          </span>
        )}
      </div>

      {!company ? (
        <div
          role="alert"
          className="alert alert-warning flex items-center gap-3"
        >
          <GraduationCap className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-medium">Set up your company profile first</p>
            <p className="text-sm text-base-content/70">
              You need a company profile to request campus recruitment.
            </p>
          </div>
          <Link
            to="/recruiter/company"
            className="btn btn-primary btn-sm ml-auto"
          >
            Create Company Profile
          </Link>
        </div>
      ) : (
        <>
          {message && (
            <div
              role="alert"
              className={`alert alert-${message.type === "success" ? "success" : "error"} flex items-center gap-3`}
            >
              {message.type === "success" ? (
                <Shield className="w-5 h-5 flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 flex-shrink-0">✕</span>
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* Section: New Request Form */}
            <Section
              title="New Campus Recruitment Request"
              icon={GraduationCap}
              badge="Define eligibility criteria for student selection. Leave fields blank to keep criteria open."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <InputWrapper
                  label="Department"
                  error={errors.department}
                  helper="e.g. CSE, EEE, TE, IPE, FDAE"
                >
                  <input
                    className="input input-bordered w-full"
                    placeholder="CSE"
                    {...register("department")}
                  />
                </InputWrapper>

                <InputWrapper
                  label="Session"
                  error={errors.session}
                  helper="e.g. 2024-25, 2025-26"
                >
                  <input
                    className="input input-bordered w-full"
                    placeholder="2024-25"
                    {...register("session")}
                  />
                </InputWrapper>

                <InputWrapper
                  label="Minimum CGPA"
                  error={errors.min_cgpa}
                  helper="0.00 - 4.00"
                >
                  <input
                    className="input input-bordered w-full"
                    type="number"
                    step="0.01"
                    min={0}
                    max={4}
                    {...register("min_cgpa", { valueAsNumber: true })}
                    placeholder="3.00"
                  />
                </InputWrapper>

                <InputWrapper
                  label="Graduation Year"
                  error={errors.graduation_year}
                  helper="e.g. 2027"
                >
                  <input
                    className="input input-bordered w-full"
                    type="number"
                    min={2020}
                    max={2030}
                    {...register("graduation_year", { valueAsNumber: true })}
                    placeholder="2027"
                  />
                </InputWrapper>

                <InputWrapper
                  label="Required Skills"
                  error={errors.skills}
                  helper="Comma separated (e.g. React, Node.js, PostgreSQL)"
                  className="sm:col-span-2"
                >
                  <input
                    className="input input-bordered w-full"
                    placeholder="React, Node.js, PostgreSQL, AWS"
                    {...register("skills")}
                  />
                </InputWrapper>
              </div>
            </Section>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-base-200">
              <button
                type="submit"
                className="btn btn-primary btn-lg flex items-center gap-2"
                disabled={listLoading}
              >
                <Sparkles className="w-5 h-5" />
                Submit Request
              </button>
            </div>
          </form>

          {/* Section: Existing Requests */}
          <Section
            title="Your Requests"
            icon={Users}
            badge={`${requests.length} request${requests.length !== 1 ? "s" : ""} submitted`}
          >
            {listLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 text-base-content/20" />
                <p className="text-base-content/60">
                  No campus recruitment requests yet.
                </p>
                <p className="text-sm text-base-content/50 mt-1">
                  Submit your first request above to get started.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map((r) => (
                  <StatusCard
                    key={r.id}
                    status={r.status}
                    createdAt={r.created_at}
                    eligibility={r.eligibility}
                  />
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

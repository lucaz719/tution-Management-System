import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type BillingLedger, type BillingPayroll } from "../../services/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { toBsMonthRangeLabel, toDualDateLabel } from "../../utils/nepaliDate";

type BillingTarget = { kind: "teacher"; id: string } | null;

const money = (value: number) => `NPR ${Number(value || 0).toLocaleString("en-NP", { maximumFractionDigits: 2 })}`;
const dateLabel = (value: string) => toDualDateLabel(value);
const monthLabel = (month: number, year: number) => {
  const date = new Date(year, month - 1, 1);
  return `${new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)} AD · ${toBsMonthRangeLabel(date)}`;
};
function statusVariant(status: string): "success" | "warning" | "error" | "info" {
  if (status === "PAID" || status === "MANUALLY_PAID" || status === "Paid") return "success";
  if (status === "OVERDUE" || status === "Overdue") return "error";
  if (status === "APPROVED_FOR_MANUAL_PAYMENT") return "info";
  return "warning";
}

function Empty({ children }: { children: string }) {
  return (
    <div className="accountant-empty" role="status">
      <span className="material-symbols-outlined" aria-hidden="true">
        inbox
      </span>
      <p>{children}</p>
    </div>
  );
}

export function SharedBillingWorkspace({ heading = "Payroll" }: { heading?: string }) {
  const [ledger, setLedger] = useState<BillingLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<BillingTarget>(null);
  const [createMode, setCreateMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [personId, setPersonId] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [bonuses, setBonuses] = useState("0");
  const [deductions, setDeductions] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLedger(await api.finances.getBillingLedger());
    } catch (next) {
      setError(next instanceof Error ? next.message : "Could not load billing records.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!target && !createMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTarget(null);
        setCreateMode(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [target, createMode]);

  const teachers = useMemo(() => (ledger?.teachers ?? []).filter((teacher) => `${teacher.teacherName} ${teacher.email} ${teacher.designation} ${teacher.branchName}`.toLowerCase().includes(query.toLowerCase())), [ledger, query]);
  const selectedTeacher = target?.kind === "teacher" ? ledger?.teachers.find((teacher) => teacher.teacherId === target.id) : undefined;

  const openCreate = (id = "") => {
    setCreateMode(true);
    setPersonId(id);
    setMessage("");
    setBonuses("0");
    setDeductions("0");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!createMode || !personId) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const result = await api.finances.createPayroll({
        staffRecordId: personId,
        month,
        year,
        bonuses: Number(bonuses),
        deductions: Number(deductions),
      });
      setMessage(result.message);
      setCreateMode(false);
      await load();
    } catch (next) {
      setError(next instanceof Error ? next.message : "Could not create the billing record.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Card hoverable={false}>
        <div className="accountant-empty" aria-busy="true">
          <p>Loading shared billing ledger…</p>
        </div>
      </Card>
    );
  if (error && !ledger)
    return (
      <Card hoverable={false}>
        <div className="accountant-empty" role="alert">
          <strong>Could not load billing</strong>
          <p>{error}</p>
          <Button onClick={() => void load()}>Retry</Button>
        </div>
      </Card>
    );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="accountant-header" style={{ marginBottom: 0 }}>
        <div className="accountant-header-title">
          <h2>{heading}</h2>
          <p className="accountant-text-muted">Create branch-owned payroll and review teacher payroll history.</p>
        </div>
        <div className="accountant-header-actions">
          <Button onClick={() => openCreate()}>Create payroll</Button>
        </div>
      </div>
      {message && (
        <p role="status" style={{ color: "var(--color-success)", margin: 0 }}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: "var(--color-error)", margin: 0 }}>
          {error}
        </p>
      )}
      <section className="accountant-controls">
        <label className="accountant-search" htmlFor="shared-billing-search">
          <span>Search teachers</span>
          <div className="accountant-search-control">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input id="shared-billing-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teachers" />
          </div>
        </label>
      </section>

      <Card hoverable={false}>
        {!teachers.length ? (
          <Empty>No teachers match this search.</Empty>
        ) : (
          <div className="accountant-table-scroll">
            <table className="accountant-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Designation</th>
                  <th>Branch</th>
                  <th>Base salary</th>
                  <th>Payroll records</th>
                  <th>Latest status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => {
                  const latest = teacher.payrolls[0];
                  return (
                    <tr key={teacher.teacherId}>
                      <td>
                        <button
                          type="button"
                          className="accountant-student-link"
                          onClick={() =>
                            setTarget({
                              kind: "teacher",
                              id: teacher.teacherId,
                            })
                          }
                        >
                          {teacher.teacherName}
                        </button>
                        <small>{teacher.email}</small>
                      </td>
                      <td>{teacher.designation}</td>
                      <td>{teacher.branchName}</td>
                      <td className="is-amount">{money(teacher.baseSalary)}</td>
                      <td>{teacher.payrolls.length}</td>
                      <td>{latest ? <StatusBadge variant={statusVariant(latest.status)}>{latest.status.replaceAll("_", " ")}</StatusBadge> : "No payroll"}</td>
                      <td className="is-actions">
                        <Button variant="outline" onClick={() => openCreate(teacher.teacherId)}>
                          Create payroll
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedTeacher && (
        <div className="billing-dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTarget(null)}>
        <Card hoverable={false} className="billing-dialog" role="dialog" aria-modal="true">
          <div className="accountant-header">
            <div className="accountant-header-title">
              <h2>{selectedTeacher.teacherName}</h2>
              <p>
                {selectedTeacher.designation} · {selectedTeacher.branchName} · {selectedTeacher.contractType}
              </p>
            </div>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Close details
            </Button>
          </div>
          <h3>Next-month payroll projection</h3>
          <p className="accountant-text-muted">Contract-based estimate; attendance deductions and bonuses are finalized when payroll is posted.</p>
          <div className="accountant-table-scroll">
            <table className="accountant-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Base</th>
                  <th>Estimated bonuses</th>
                  <th>Estimated deductions</th>
                  <th>Projected net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{monthLabel(selectedTeacher.projection.month, selectedTeacher.projection.year)}</td>
                  <td className="is-amount">{money(selectedTeacher.projection.baseSalary)}</td>
                  <td className="is-amount">{money(selectedTeacher.projection.bonuses)}</td>
                  <td className="is-amount">{money(selectedTeacher.projection.deductions)}</td>
                  <td className="is-amount">{money(selectedTeacher.projection.netPayable)}</td>
                  <td>
                    <StatusBadge variant="info">Projection</StatusBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 24 }}>Payroll history</h3>
          {selectedTeacher.payrolls.length ? (
            <div className="accountant-table-scroll">
              <table className="accountant-table">
                <thead>
                  <tr>
                    <th>Payroll</th>
                    <th>Month</th>
                    <th>Base</th>
                    <th>Bonuses</th>
                    <th>Deductions</th>
                    <th>Net payable</th>
                    <th>Payment/reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeacher.payrolls.map((payroll: BillingPayroll) => (
                    <tr key={payroll.id}>
                      <td className="is-reference">{payroll.id.slice(0, 8)}</td>
                      <td>{monthLabel(payroll.month, payroll.year)}</td>
                      <td className="is-amount">{money(payroll.baseSalary)}</td>
                      <td className="is-amount">{money(payroll.bonuses)}</td>
                      <td className="is-amount">{money(payroll.deductions)}</td>
                      <td className="is-amount">{money(payroll.netPayable)}</td>
                      <td>{payroll.paymentDate ? `${dateLabel(payroll.paymentDate)} · ${payroll.settlementReference ?? "No reference"}` : "—"}</td>
                      <td>
                        <StatusBadge variant={statusVariant(payroll.status)}>{payroll.status.replaceAll("_", " ")}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No payroll has been posted for this teacher.</Empty>
          )}
        </Card></div>
      )}

      {createMode && (
        <div className="billing-dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCreateMode(false)}>
        <Card hoverable={false} className="billing-dialog" role="dialog" aria-modal="true">
          <div className="accountant-header">
            <div className="accountant-header-title">
              <h2>Create payroll</h2>
              <p>This record will be visible in every authorized finance portal.</p>
            </div>
            <Button variant="outline" onClick={() => setCreateMode(false)}>
              Cancel
            </Button>
          </div>
          <form className="accountant-form" onSubmit={(event) => void submit(event)} aria-busy={submitting}>
            <label htmlFor="billing-person">
              Teacher <span aria-hidden="true">*</span>
              <select
                id="billing-person"
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
                required
              >
                <option value="">Select a record</option>
                {ledger?.teachers.map((teacher) => (
                      <option key={teacher.teacherId} value={teacher.teacherId}>
                        {teacher.teacherName} · {teacher.branchName}
                      </option>
                    ))}
              </select>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              <label htmlFor="billing-month">
                Month <span aria-hidden="true">*</span>
                <select id="billing-month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2020, index, 1))}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="billing-year">
                Year <span aria-hidden="true">*</span>
                <input id="billing-year" type="text" inputMode="numeric" pattern="20[0-9]{2}|2100" value={year} onChange={(event) => setYear(Number(event.target.value))} required />
              </label>
              <div role="note" className="accountant-text-muted">
                Base pay comes from the staff compensation contract. Hourly contracts use confirmed session minutes for this period.
              </div>
            </div>
            <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                }}
              >
                <label htmlFor="payroll-bonuses">
                  Bonuses (NPR)
                  <input id="payroll-bonuses" type="text" inputMode="decimal" value={bonuses} onChange={(event) => setBonuses(event.target.value)} />
                </label>
                <label htmlFor="payroll-deductions">
                  Deductions (NPR)
                  <input id="payroll-deductions" type="text" inputMode="decimal" value={deductions} onChange={(event) => setDeductions(event.target.value)} />
                </label>
              </div>
            <Button type="submit" disabled={submitting || !personId}>
              {submitting ? "Creating…" : "Create payroll"}
            </Button>
          </form>
        </Card></div>
      )}
    </div>
  );
}

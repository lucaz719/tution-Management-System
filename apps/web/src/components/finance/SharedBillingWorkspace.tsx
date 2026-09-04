import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type BillingInvoice, type BillingLedger, type BillingPayroll } from "../../services/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { toBsMonthRangeLabel, toDualDateLabel } from "../../utils/nepaliDate";

type BillingTarget = { kind: "student"; id: string } | { kind: "teacher"; id: string } | null;
type CreateMode = "student" | "teacher" | null;

const money = (value: number) => `NPR ${Number(value || 0).toLocaleString("en-NP", { maximumFractionDigits: 2 })}`;
const dateLabel = (value: string) => toDualDateLabel(value);
const monthLabel = (month: number, year: number) => {
  const date = new Date(year, month - 1, 1);
  return `${new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)} AD · ${toBsMonthRangeLabel(date)}`;
};
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function invoiceLabel(invoice: BillingInvoice) {
  if (invoice.status === "PAID") return "Paid";
  return invoice.overdue ? "Overdue" : invoice.status === "UNPAID" ? "Due" : invoice.status.replaceAll("_", " ");
}

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

export function SharedBillingWorkspace({ heading = "Billing & payroll" }: { heading?: string }) {
  const [ledger, setLedger] = useState<BillingLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"students" | "teachers">("students");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<BillingTarget>(null);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [personId, setPersonId] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [fine, setFine] = useState("0");
  const [invoiceType, setInvoiceType] = useState<"TUITION" | "SUBJECT" | "ACTIVITY">("TUITION");
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

  const students = useMemo(() => (ledger?.students ?? []).filter((student) => `${student.studentName} ${student.email} ${student.grade} ${student.branchName}`.toLowerCase().includes(query.toLowerCase())), [ledger, query]);
  const teachers = useMemo(() => (ledger?.teachers ?? []).filter((teacher) => `${teacher.teacherName} ${teacher.email} ${teacher.designation} ${teacher.branchName}`.toLowerCase().includes(query.toLowerCase())), [ledger, query]);
  const selectedStudent = target?.kind === "student" ? ledger?.students.find((student) => student.studentId === target.id) : undefined;
  const selectedTeacher = target?.kind === "teacher" ? ledger?.teachers.find((teacher) => teacher.teacherId === target.id) : undefined;

  const openCreate = (mode: Exclude<CreateMode, null>, id = "") => {
    setCreateMode(mode);
    setPersonId(id);
    setMessage("");
    if (mode === "student") {
      const student = ledger?.students.find((item) => item.studentId === id);
      setAmount(String(student?.monthlyAmount || ""));
      setDiscount("0");
      setFine("0");
    } else {
      setAmount("");
      setBonuses("0");
      setDeductions("0");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!createMode || !personId || (createMode === "student" && Number(amount) <= 0)) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (createMode === "student") {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const due = new Date(year, month - 1, 10);
        const result = await api.finances.createInvoice({
          studentId: personId,
          amount: Number(amount),
          discount: Number(discount),
          fine: Number(fine),
          invoiceType,
          billingCycleStart: isoDate(start),
          billingCycleEnd: isoDate(end),
          dueDate: isoDate(due),
        });
        setMessage(result.message);
      } else {
        const result = await api.finances.createPayroll({
          staffRecordId: personId,
          month,
          year,
          bonuses: Number(bonuses),
          deductions: Number(deductions),
        });
        setMessage(result.message);
      }
      setCreateMode(null);
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
          <p className="accountant-text-muted">One persisted ledger shared by branch finance staff and tenant administration.</p>
        </div>
        <div className="accountant-header-actions">
          <Button onClick={() => openCreate(tab === "students" ? "student" : "teacher")}>Create {tab === "students" ? "invoice" : "payroll"}</Button>
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
        <div className="accountant-tabs" role="tablist" aria-label="Billing records">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "students"}
            onClick={() => {
              setTab("students");
              setTarget(null);
            }}
          >
            Students
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "teachers"}
            onClick={() => {
              setTab("teachers");
              setTarget(null);
            }}
          >
            Teachers
          </button>
        </div>
        <label className="accountant-search" htmlFor="shared-billing-search">
          <span>Search {tab}</span>
          <div className="accountant-search-control">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input id="shared-billing-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}`} />
          </div>
        </label>
      </section>

      <Card hoverable={false}>
        {tab === "students" ? (
          !students.length ? (
            <Empty>No students match this search.</Empty>
          ) : (
            <div className="accountant-table-scroll">
              <table className="accountant-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Grade</th>
                    <th>Branch</th>
                    <th>Monthly projection</th>
                    <th>Invoices</th>
                    <th>Latest status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const latest = student.invoices[0];
                    return (
                      <tr key={student.studentId}>
                        <td>
                          <button
                            type="button"
                            className="accountant-student-link"
                            onClick={() =>
                              setTarget({
                                kind: "student",
                                id: student.studentId,
                              })
                            }
                          >
                            {student.studentName}
                          </button>
                          <small>{student.email}</small>
                        </td>
                        <td>{student.grade}</td>
                        <td>{student.branchName}</td>
                        <td className="is-amount">{money(student.monthlyAmount)}</td>
                        <td>{student.invoices.length}</td>
                        <td>{latest ? <StatusBadge variant={statusVariant(invoiceLabel(latest))}>{invoiceLabel(latest)}</StatusBadge> : "No invoice"}</td>
                        <td className="is-actions">
                          <Button variant="outline" onClick={() => openCreate("student", student.studentId)}>
                            Bill now
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : !teachers.length ? (
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
                        <Button variant="outline" onClick={() => openCreate("teacher", teacher.teacherId)}>
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

      {selectedStudent && (
        <Card hoverable={false}>
          <div className="accountant-header">
            <div className="accountant-header-title">
              <h2>{selectedStudent.studentName}</h2>
              <p>
                {selectedStudent.grade} · {selectedStudent.branchName} · course through {dateLabel(selectedStudent.courseEnd)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Close details
            </Button>
          </div>
          <h3>Future billing schedule</h3>
          <p className="accountant-text-muted">Projected from active course fees; these are not posted invoices.</p>
          {selectedStudent.projections.length ? (
            <div className="accountant-table-scroll">
              <table className="accountant-table">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Expected due date</th>
                    <th>Projected amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent.projections.map((projection) => (
                    <tr key={projection.cycleStart}>
                      <td>
                        {dateLabel(projection.cycleStart)} – {dateLabel(projection.cycleEnd)}
                      </td>
                      <td>{dateLabel(projection.dueDate)}</td>
                      <td className="is-amount">{money(projection.amount)}</td>
                      <td>
                        <StatusBadge variant="info">Projection</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No future cycles remain in the current one-year course window.</Empty>
          )}
          <h3 style={{ marginTop: 24 }}>Invoice history</h3>
          {selectedStudent.invoices.length ? (
            <div className="accountant-table-scroll">
              <table className="accountant-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Type</th>
                    <th>Cycle</th>
                    <th>Base</th>
                    <th>Discount</th>
                    <th>Fine</th>
                    <th>Net payable</th>
                    <th>Due</th>
                    <th>Paid/reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="is-reference">{invoice.id.slice(0, 8)}</td>
                      <td>{invoice.invoiceType}</td>
                      <td>
                        {dateLabel(invoice.billingCycleStart)} – {dateLabel(invoice.billingCycleEnd)}
                      </td>
                      <td className="is-amount">{money(invoice.amount)}</td>
                      <td className="is-amount">{money(invoice.discount)}</td>
                      <td className="is-amount">{money(invoice.fine)}</td>
                      <td className="is-amount">{money(invoice.netPayable)}</td>
                      <td>{dateLabel(invoice.dueDate)}</td>
                      <td>{invoice.paymentDate ? `${dateLabel(invoice.paymentDate)} · ${invoice.transactionId ?? "No reference"}` : "—"}</td>
                      <td>
                        <StatusBadge variant={statusVariant(invoiceLabel(invoice))}>{invoiceLabel(invoice)}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No invoices have been posted for this student.</Empty>
          )}
        </Card>
      )}

      {selectedTeacher && (
        <Card hoverable={false}>
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
        </Card>
      )}

      {createMode && (
        <Card hoverable={false}>
          <div className="accountant-header">
            <div className="accountant-header-title">
              <h2>Create {createMode === "student" ? "invoice" : "payroll"}</h2>
              <p>This record will be visible in every authorized finance portal.</p>
            </div>
            <Button variant="outline" onClick={() => setCreateMode(null)}>
              Cancel
            </Button>
          </div>
          <form className="accountant-form" onSubmit={(event) => void submit(event)} aria-busy={submitting}>
            <label htmlFor="billing-person">
              {createMode === "student" ? "Student" : "Teacher"} <span aria-hidden="true">*</span>
              <select
                id="billing-person"
                value={personId}
                onChange={(event) => {
                  const id = event.target.value;
                  setPersonId(id);
                  if (createMode === "student") {
                    const record = ledger?.students.find((item) => item.studentId === id)?.monthlyAmount;
                    setAmount(String(record || ""));
                  }
                }}
                required
              >
                <option value="">Select a record</option>
                {createMode === "student"
                  ? ledger?.students.map((student) => (
                      <option key={student.studentId} value={student.studentId}>
                        {student.studentName} · {student.branchName}
                      </option>
                    ))
                  : ledger?.teachers.map((teacher) => (
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
              {createMode === "student" ? (
                <label htmlFor="billing-amount">
                  Base amount (NPR) <span aria-hidden="true">*</span>
                  <input id="billing-amount" type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                </label>
              ) : (
                <div role="note" className="accountant-text-muted">
                  Base pay comes from the staff compensation contract. Hourly contracts use confirmed session minutes for this period.
                </div>
              )}
            </div>
            {createMode === "student" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                }}
              >
                <label htmlFor="invoice-type">
                  Invoice type
                  <select id="invoice-type" value={invoiceType} onChange={(event) => setInvoiceType(event.target.value as typeof invoiceType)}>
                    <option value="TUITION">Tuition</option>
                    <option value="SUBJECT">Subject</option>
                    <option value="ACTIVITY">Monthly activity</option>
                  </select>
                </label>
                <label htmlFor="invoice-discount">
                  Discount (NPR)
                  <input id="invoice-discount" type="text" inputMode="decimal" value={discount} onChange={(event) => setDiscount(event.target.value)} />
                </label>
                <label htmlFor="invoice-fine">
                  Fine (NPR)
                  <input id="invoice-fine" type="text" inputMode="decimal" value={fine} onChange={(event) => setFine(event.target.value)} />
                </label>
              </div>
            ) : (
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
            )}
            <Button type="submit" disabled={submitting || !personId || (createMode === "student" && Number(amount) <= 0)}>
              {submitting ? "Creating…" : `Create ${createMode === "student" ? "invoice" : "payroll"}`}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

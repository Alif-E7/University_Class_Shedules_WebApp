import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { auth, analytics, importApi, departments, teachers, courses, offerings, users, schedules as schedulesApi } from '../api';


/* ── Login ── */
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('admin@university.edu');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await auth.login(email, password);
      auth.setToken(res.token);
      auth.setUser(res.user);
      onLogin();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h1>Admin Login</h1>
      <p className="muted">Manage departments, teachers, courses, and schedules.</p>
      {err && <div className="alert alert-error">{err}</div>}
      <form className="card" onSubmit={handleLogin}>
        <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
      </form>
      <p className="muted" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>Default: admin@university.edu / admin123</p>
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard() {
  const [dash, setDash] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { analytics.dashboard().then(setDash).catch(e => setErr(e.message)); }, []);

  if (err) return <div className="alert alert-error">{err}</div>;
  if (!dash) return <div className="home-loading">Loading dashboard…</div>;

  return (
    <div>
      <h2>Dashboard Overview</h2>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { v: dash.totalDepartments, l: 'Departments', icon: '🏛️' },
          { v: dash.totalTeachers, l: 'Teachers', icon: '👩‍🏫' },
          { v: dash.totalCourses, l: 'Courses', icon: '📖' },
          { v: dash.totalSlots, l: 'Schedule Slots', icon: '📅' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{s.icon}</div>
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {dash.conflictCount > 0 && (
        <div className="alert alert-warn">
          <strong>⚠ {dash.conflictCount} schedule conflict(s) detected.</strong>
          <NavLink to="/admin/conflicts" style={{ marginLeft: '0.5rem' }}>View conflicts →</NavLink>
        </div>
      )}

      {dash.departmentStats?.length > 0 && (
        <div className="card">
          <h3>Department Statistics</h3>
          <table className="data-table">
            <thead><tr><th>Code</th><th>Department</th><th>Teachers</th><th>Courses</th></tr></thead>
            <tbody>
              {dash.departmentStats.map(d => (
                <tr key={d.department_code}>
                  <td><span className="badge badge-accent">{d.department_code}</span></td>
                  <td>{d.department_name}</td>
                  <td>{d.teachers}</td>
                  <td>{d.courses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Generic CRUD ── */
function CrudPage({ title, icon, api: apiModule, fields, idField = 'id', extraFilters, importType }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Excel Import States
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importStep, setImportStep] = useState(0); // 0=upload, 1=preview, 2=complete
  const [importErr, setImportErr] = useState('');
  const [importMsg, setImportMsg] = useState('');

  const load = () => apiModule.list(extraFilters || {}).then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      if (form[idField]) {
        await apiModule.update(form[idField], form);
        setMsg('Updated successfully');
      } else {
        await apiModule.create(form);
        setMsg('Created successfully');
      }
      setForm(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this record?')) return;
    try { await apiModule.remove(id); load(); setMsg('Deleted'); } catch (e) { setErr(e.message); }
  };

  const handleImportPreview = async () => {
    if (!importFile) return;
    setImportErr(''); setImportMsg('');
    try {
      const data = await importApi.preview(importFile, importType);
      setImportPreview(data);
      setImportStep(1);
    } catch (e) { setImportErr(e.message); }
  };

  const handleImportConfirm = async () => {
    if (!importPreview?.batch_id) return;
    setImportErr('');
    try {
      await importApi.confirm(importPreview.batch_id, null);
      setImportMsg('✅ Import committed successfully!');
      setImportStep(2);
    } catch (e) { setImportErr(e.message); }
  };

  const handleImportReject = async () => {
    if (!importPreview?.batch_id) return;
    try {
      await importApi.reject(importPreview.batch_id);
      setImportPreview(null);
      setImportStep(0);
      setImportFile(null);
      setImportErr('');
    } catch (e) { setImportErr(e.message); }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h2>{icon} {title}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {importType && (
            <button className="btn btn-outline" onClick={() => setShowImport(true)}>📥 Import Excel</button>
          )}
          <button className="btn btn-primary" onClick={() => setForm({})}>+ Add New</button>
        </div>
      </div>

      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form[idField] ? 'Edit' : 'Create'} {title.replace(/s$/, '')}</h2>
            <form onSubmit={save}>
              {fields.map(f => (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                      <option value="">Select...</option>
                      {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={form[f.key] || ''}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); setImportPreview(null); setImportStep(0); setImportErr(''); setImportFile(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>📥 Import {title} from Excel</h2>
            {importErr && <div className="alert alert-error">{importErr}</div>}
            {importMsg && <div className="alert alert-success">{importMsg}</div>}

            {importStep === 0 ? (
              <div>
                <p className="muted">Upload your Excel file to preview and validate the {title.toLowerCase()} list.</p>
                <div className="upload-zone" style={{ marginTop: '1rem' }}>
                  <div className="upload-zone-icon">📄</div>
                  <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} style={{ border: 'none', padding: 0 }} />
                </div>
                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowImport(false); setImportFile(null); }}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleImportPreview} disabled={!importFile}>Preview Import →</button>
                </div>
              </div>
            ) : importStep === 1 && importPreview ? (
              <div>
                <h3>Import Preview</h3>
                <div className="grid grid-5" style={{ margin: '1rem 0' }}>
                  {[
                    { v: importPreview.summary.departments || 0, l: 'Departments' },
                    { v: importPreview.summary.teachers || 0, l: 'Teachers' },
                    { v: importPreview.summary.courses || 0, l: 'Courses' },
                    { v: importPreview.summary.offerings || 0, l: 'Offerings' },
                    { v: importPreview.summary.schedules || 0, l: 'Schedules' },
                  ].map(s => (
                    <div key={s.l} className="stat-card" style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <div className="stat-value" style={{ fontSize: '1.2rem' }}>{s.v}</div>
                      <div className="stat-label" style={{ fontSize: '0.7rem' }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {importPreview.errors?.length > 0 && (
                  <div className="alert alert-error" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <strong>❌ {importPreview.errors.length} error(s):</strong>
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                      {importPreview.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                      {importPreview.errors.length > 10 && <li>...and {importPreview.errors.length - 10} more</li>}
                    </ul>
                  </div>
                )}

                {importPreview.warnings?.length > 0 && (
                  <div className="alert alert-warn" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <strong>⚠ {importPreview.warnings.length} warning(s):</strong>
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                      {importPreview.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {importPreview.conflicts?.length > 0 && (
                  <div className="alert alert-warn" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    <strong>⚡ {importPreview.conflicts.length} conflict(s) detected:</strong>
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                      {importPreview.conflicts.slice(0, 5).map((c, i) => <li key={i}>{c.message}</li>)}
                    </ul>
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                  <button className="btn btn-danger" onClick={handleImportReject}>❌ Reject</button>
                  <button className="btn btn-primary" onClick={handleImportConfirm} disabled={importPreview.errors?.length > 0}>✅ Approve & Commit</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3>Import Complete!</h3>
                <p className="muted">Data has been successfully imported.</p>
                <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                  <button className="btn btn-primary" onClick={() => { setShowImport(false); setImportPreview(null); setImportStep(0); setImportFile(null); setImportMsg(''); load(); }}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {fields.filter(f => !f.hideInTable).map(f => <th key={f.key}>{f.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, idx) => (
              <tr key={item[idField] || idx}>
                {fields.filter(f => !f.hideInTable).map(f => (
                  <td key={f.key}>{f.render ? f.render(item[f.key], item) : String(item[f.key] ?? '')}</td>
                ))}
                <td className="actions">
                  <button className="btn btn-sm btn-outline" onClick={() => setForm(item)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(item[idField])}>Del</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={fields.length + 1} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No records found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Import Wizard ── */
function ImportWizard() {
  const [step, setStep] = useState(0); // 0=upload, 1=preview, 2=done
  const [importType, setImportType] = useState('all'); // 'all', 'departments', 'teachers', 'courses', 'offerings', 'schedules'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handlePreview = async () => {
    if (!file) return;
    setErr(''); setMsg('');
    try {
      const data = await importApi.preview(file, importType);
      setPreview(data);
      setStep(1);
    } catch (e) { setErr(e.message); }
  };

  const handleConfirm = async () => {
    if (!preview?.batch_id) return;
    setErr('');
    try {
      await importApi.confirm(preview.batch_id, null);
      setMsg('✅ Import committed successfully! Data is now live.');
      setStep(2);
    } catch (e) { setErr(e.message); }
  };

  const handleReject = async () => {
    if (!preview?.batch_id) return;
    try {
      await importApi.reject(preview.batch_id);
      setPreview(null);
      setStep(0);
      setMsg('Import rejected.');
    } catch (e) { setErr(e.message); }
  };

  const steps = ['Upload', 'Preview & Validate', 'Approve', 'Done'];

  return (
    <div>
      <h2>📥 Excel Import</h2>
      <p className="muted">Upload → Validate → Preview → Approve → Commit</p>

      <div className="import-steps" style={{ margin: '1.5rem 0' }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`import-step ${step === i ? 'active' : step > i ? 'done' : ''}`}>
              <span className="import-step-num">{step > i ? '✓' : i + 1}</span>
              <span>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="import-step-line" />}
          </div>
        ))}
      </div>

      {err && <div className="alert alert-error">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {step === 0 && (
        <div className="card">
          <h3>Select Excel File</h3>

          <div className="field" style={{ marginTop: '1rem' }}>
            <label>Import Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.25rem' }}>
              {[
                { value: 'all', label: '🗂 Full Workbook', desc: 'All sheets combined' },
                { value: 'departments', label: '🏛️ Departments Only', desc: 'Single sheet format' },
                { value: 'teachers', label: '👩‍🏫 Teachers Only', desc: 'Single sheet format' },
                { value: 'courses', label: '📖 Courses Only', desc: 'Single sheet format' },
                { value: 'offerings', label: '📋 Offerings Only', desc: 'Single sheet format' },
                { value: 'schedules', label: '🕐 Schedules Only', desc: 'Single sheet format' },
              ].map(opt => (
                <div
                  key={opt.value}
                  className={`card ${importType === opt.value ? 'active' : ''}`}
                  onClick={() => {
                    setImportType(opt.value);
                    setFile(null);
                  }}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: importType === opt.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: importType === opt.value ? 'var(--accent-soft)' : 'var(--surface)',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '0.82rem', color: importType === opt.value ? 'var(--accent)' : 'var(--ink)' }}>{opt.label}</div>
                  <div className="muted" style={{ fontSize: '0.68rem', marginTop: '0.15rem' }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="muted" style={{ fontSize: '0.8rem', marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <strong>💡 Category Guide:</strong>{' '}
            {importType === 'all' && 'Requires a multi-sheet Excel file. Sheets: Departments, Teachers, Courses, Offerings, Schedule.'}
            {importType === 'departments' && 'Requires an Excel file (or first sheet) with columns: department_code, department_name.'}
            {importType === 'teachers' && 'Requires an Excel file (or first sheet) with columns: staff_no, department, full_name, email, office_room.'}
            {importType === 'courses' && 'Requires an Excel file (or first sheet) with columns: course_code, department, course_title, credit, year, semester.'}
            {importType === 'offerings' && 'Requires an Excel file (or first sheet) with columns: course_code, staff_no, term_code, section.'}
            {importType === 'schedules' && 'Requires an Excel file (or first sheet) with columns: course_code, section, day_of_week, start_time, end_time, room, building.'}
          </p>

          <div className="upload-zone" style={{ marginTop: '1rem' }}>
            <div className="upload-zone-icon">📄</div>
            <input key={importType} type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} style={{ border: 'none', padding: 0 }} />
          </div>

          <button className="btn btn-primary" onClick={handlePreview} disabled={!file} style={{ marginTop: '1rem' }}>
            Preview Import →
          </button>
        </div>
      )}

      {step === 1 && preview && (
        <div className="card">
          <h3>Import Preview</h3>

          <div className="grid grid-5" style={{ margin: '1rem 0' }}>
            {[
              { v: preview.summary.departments || 0, l: 'Departments' },
              { v: preview.summary.teachers || 0, l: 'Teachers' },
              { v: preview.summary.courses || 0, l: 'Courses' },
              { v: preview.summary.offerings || 0, l: 'Offerings' },
              { v: preview.summary.schedules || 0, l: 'Schedules' },
            ].map(s => (
              <div key={s.l} className="stat-card" style={{ padding: '1rem' }}>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>

          {preview.errors?.length > 0 && (
            <div className="alert alert-error">
              <strong>❌ {preview.errors.length} error(s):</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {preview.errors.slice(0, 15).map((e, i) => <li key={i}>{e}</li>)}
                {preview.errors.length > 15 && <li>...and {preview.errors.length - 15} more</li>}
              </ul>
            </div>
          )}

          {preview.warnings?.length > 0 && (
            <div className="alert alert-warn">
              <strong>⚠ {preview.warnings.length} warning(s):</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {preview.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {preview.conflicts?.length > 0 && (
            <div className="alert alert-warn">
              <strong>⚡ {preview.conflicts.length} conflict(s) detected:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                {preview.conflicts.slice(0, 10).map((c, i) => <li key={i}>{c.message}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={preview.errors?.length > 0}>
              ✅ Approve & Commit
            </button>
            <button className="btn btn-danger" onClick={handleReject}>❌ Reject</button>
            <button className="btn btn-outline" onClick={() => { setStep(0); setPreview(null); }}>← Back</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2>Import Complete!</h2>
          <p className="muted">Data has been committed to the database and is now visible on the public portal.</p>
          <button className="btn btn-primary" onClick={() => { setStep(0); setPreview(null); setMsg(''); }} style={{ marginTop: '1rem' }}>
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Conflicts View ── */
function ConflictsView() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => { analytics.conflicts().then(setList).catch(e => setErr(e.message)); }, []);

  return (
    <div>
      <h2>⚡ Schedule Conflicts</h2>
      {err && <div className="alert alert-error">{err}</div>}
      {list.length === 0 ? (
        <div className="alert alert-success">✅ No conflicts detected. All schedules are clean!</div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Teacher</th><th>Day</th><th>Course A</th><th>Time A</th><th>Course B</th><th>Time B</th></tr></thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={i}>
                  <td>{c.teacher_name} <span className="badge badge-muted">{c.staff_no}</span></td>
                  <td>{c.day_of_week}</td>
                  <td><span className="badge badge-accent">{c.course_a}</span> {c.title_a}</td>
                  <td>{String(c.a_start).slice(0, 5)}–{String(c.a_end).slice(0, 5)}</td>
                  <td><span className="badge badge-warn">{c.course_b}</span> {c.title_b}</td>
                  <td>{String(c.b_start).slice(0, 5)}–{String(c.b_end).slice(0, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main Admin Page ── */
export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(auth.isLoggedIn());
  const [deptList, setDeptList] = useState([]);
  const [validating, setValidating] = useState(true);
  const user = auth.getUser();
  const isCentral = user?.role === 'central_admin';

  // Validate token on mount
  useEffect(() => {
    if (loggedIn) {
      auth.me().then(() => {
        setValidating(false);
        departments.list().then(setDeptList).catch(() => { });
      }).catch(() => {
        auth.logout();
        setLoggedIn(false);
        setValidating(false);
      });
    } else {
      setValidating(false);
    }
  }, [loggedIn]);

  if (validating) return <div className="home-loading">Verifying session…</div>;
  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />;

  const handleLogout = () => { auth.logout(); setLoggedIn(false); };

  const deptOptions = deptList.map(d => ({ value: d.department_id, label: `${d.department_code} — ${d.department_name}` }));
  const roleOptions = [{ value: 'central_admin', label: 'Central Admin' }, { value: 'dept_admin', label: 'Department Admin' }];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h3>{user?.username || 'Admin'}</h3>
          <p>{user?.role === 'central_admin' ? '🔑 Central Admin' : `📂 ${user?.department_code || 'Dept'} Admin`}</p>
        </div>

        <div className="admin-sidebar-section">
          <div className="admin-sidebar-section-title">Overview</div>
          <NavLink to="/admin" end>📊 Dashboard</NavLink>
          <NavLink to="/admin/import">📥 Import Excel</NavLink>
          <NavLink to="/admin/conflicts">⚡ Conflicts</NavLink>
        </div>

        {isCentral && (
          <div className="admin-sidebar-section">
            <div className="admin-sidebar-section-title">System</div>
            <NavLink to="/admin/users">👤 User Accounts</NavLink>
          </div>
        )}

        <div className="admin-sidebar-section">
          <div className="admin-sidebar-section-title">Data</div>
          <NavLink to="/admin/departments">🏛️ Departments</NavLink>
          <NavLink to="/admin/teachers">👩‍🏫 Teachers</NavLink>
          <NavLink to="/admin/courses">📖 Courses</NavLink>
          <NavLink to="/admin/offerings">📋 Offerings</NavLink>
          <NavLink to="/admin/schedules">🕐 Schedules</NavLink>
        </div>

        <div className="admin-sidebar-section" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ margin: '0 1.25rem', width: 'calc(100% - 2.5rem)' }}>
            Logout
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="import" element={<ImportWizard />} />
          <Route path="conflicts" element={<ConflictsView />} />

          {isCentral && <>
            <Route path="users" element={
              <CrudPage title="User Accounts" icon="👤" api={users} idField="user_id" fields={[
                { key: 'username', label: 'Username', required: true },
                { key: 'email', label: 'Email', required: true, type: 'email' },
                { key: 'password', label: 'Password', type: 'password', hideInTable: true },
                { key: 'role', label: 'Role', type: 'select', options: roleOptions, render: v => <span className="badge badge-accent">{v}</span> },
                { key: 'department_id', label: 'Department', type: 'select', options: deptOptions, render: (v, item) => item.department_code || '—' },
              ]} />
            } />
          </>}

          <Route path="departments" element={
            <CrudPage title="Departments" icon="🏛️" api={departments} idField="department_id" importType="departments" fields={[
              { key: 'department_code', label: 'Code', required: true, placeholder: 'CSE' },
              { key: 'department_name', label: 'Name', required: true, placeholder: 'Computer Science and Engineering' },
              { key: 'office_email', label: 'Office Email', placeholder: 'cse@univ.edu' },
            ]} />
          } />
          <Route path="teachers" element={
            <CrudPage title="Teachers" icon="👩‍🏫" api={teachers} idField="teacher_id" importType="teachers" fields={[
              { key: 'staff_no', label: 'Staff No', required: true, placeholder: 'CSE-001' },
              { key: 'full_name', label: 'Full Name', required: true },
              { key: 'designation', label: 'Designation', placeholder: 'Professor' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Phone' },
              { key: 'office_room', label: 'Office Room' },
              ...(isCentral ? [{ key: 'department_id', label: 'Department', type: 'select', options: deptOptions, render: (v, item) => item.department_code || '—' }] : []),
            ]} />
          } />
          <Route path="courses" element={
            <CrudPage title="Courses" icon="📖" api={courses} idField="course_id" importType="courses" fields={[
              { key: 'course_code', label: 'Course Code', required: true, placeholder: 'CSE101' },
              { key: 'course_title', label: 'Title', required: true },
              { key: 'credit', label: 'Credits', type: 'number' },
              { key: 'year', label: 'Year (1-4)', type: 'number', placeholder: '1' },
              { key: 'semester', label: 'Semester (1-2)', type: 'number', placeholder: '1' },
              ...(isCentral ? [{ key: 'department_id', label: 'Department', type: 'select', options: deptOptions, render: (v, item) => item.department_code || '—' }] : []),
            ]} />
          } />
          <Route path="offerings" element={
            <CrudPage title="Course Offerings" icon="📋" api={offerings} idField="offering_id" importType="offerings" fields={[
              { key: 'course_code', label: 'Course', render: (v, item) => `${item.course_code || ''} ${item.course_title || ''}` },
              { key: 'teacher_name', label: 'Teacher', render: (v, item) => `${item.teacher_name || ''} (${item.staff_no || ''})` },
              { key: 'section', label: 'Section', render: v => <span className="badge badge-muted">{v}</span> },
              { key: 'course_id', label: 'Course ID', hideInTable: true, type: 'number' },
              { key: 'teacher_id', label: 'Teacher ID', hideInTable: true, type: 'number' },
            ]} />
          } />
          <Route path="schedules" element={
            <CrudPage title="Schedule Slots" icon="🕐" api={schedulesApi} idField="slot_id" importType="schedules" fields={[
              { key: 'course_code', label: 'Course' },
              { key: 'teacher_name', label: 'Teacher' },
              { key: 'day_of_week', label: 'Day', required: true },
              { key: 'start_time', label: 'Start', required: true, type: 'time' },
              { key: 'end_time', label: 'End', required: true, type: 'time' },
              { key: 'room_number', label: 'Room' },
              { key: 'offering_id', label: 'Offering ID', hideInTable: true, type: 'number' },
              { key: 'room_id', label: 'Room ID', hideInTable: true, type: 'number' },
            ]} />
          } />
        </Routes>
      </div>
    </div>
  );
}


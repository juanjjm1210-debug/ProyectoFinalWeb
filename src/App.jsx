import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

const occupationProfiles = {
  student: {
    label: "Estudiante",
    heading: "Organiza tu vida de estudiante",
    description: "Lleva el control de tus materias, entregas y tiempo de estudio.",
    listTitle: "Mis actividades de estudio",
    newTaskTitle: "Nueva actividad de estudio",
    categoryLabel: "Materia o curso",
    categoryPlaceholder: "Ej. Biología",
    taskPlaceholder: "Ej. Preparar el examen de biología",
  },
  employee: {
    label: "Trabajador/a",
    heading: "Organiza tu jornada de trabajo",
    description: "Mantén tus pendientes, proyectos y fechas de entrega bajo control.",
    listTitle: "Mis pendientes de trabajo",
    newTaskTitle: "Nuevo pendiente de trabajo",
    categoryLabel: "Área o proyecto",
    categoryPlaceholder: "Ej. Proyecto de ventas",
    taskPlaceholder: "Ej. Preparar el informe semanal",
  },
  independent: {
    label: "Independiente",
    heading: "Tus proyectos, en orden",
    description: "Planifica entregas, clientes y próximos pasos de tu trabajo independiente.",
    listTitle: "Mis proyectos y tareas",
    newTaskTitle: "Nueva tarea o proyecto",
    categoryLabel: "Cliente o proyecto",
    categoryPlaceholder: "Ej. Proyecto de diseño",
    taskPlaceholder: "Ej. Enviar propuesta al cliente",
  },
  both: {
    label: "Estudio y trabajo",
    heading: "Encuentra el equilibrio entre estudio y trabajo",
    description: "Reúne tus clases, turnos y responsabilidades en un solo lugar.",
    listTitle: "Mis actividades",
    newTaskTitle: "Nueva actividad",
    categoryLabel: "Materia, área o proyecto",
    categoryPlaceholder: "Ej. Curso o proyecto",
    taskPlaceholder: "Ej. Avanzar con la próxima entrega",
  },
  other: {
    label: "Otra ocupación",
    heading: "Organiza tus actividades a tu manera",
    description: "Planifica responsabilidades, objetivos y fechas importantes.",
    listTitle: "Mis actividades",
    newTaskTitle: "Nueva actividad",
    categoryLabel: "Área o categoría",
    categoryPlaceholder: "Ej. Proyecto personal",
    taskPlaceholder: "Ej. Completar mi próxima actividad",
  },
};

function getOccupationProfile(user) {
  return occupationProfiles[user?.occupation] ?? occupationProfiles.student;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error("No se pudo conectar con RootTask. Inténtalo de nuevo en unos momentos.");
  }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar navbar-expand bg-white border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold brand" to="/">
          <span className="brand-mark">R</span> RootTask
        </Link>
        <div className="navbar-nav ms-auto flex-row align-items-center gap-1 gap-md-3">
          <Link className="nav-link" to="/">Inicio</Link>
          {user ? (
            <>
              <Link className="nav-link" to="/mis-tareas">Mis tareas</Link>
              <button className="btn btn-sm btn-outline-primary ms-1" onClick={onLogout} type="button">Cerrar sesión</button>
            </>
          ) : (
            <Link className="btn btn-sm btn-outline-primary ms-1" to="/cuenta">Ingresar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <>
      <main>
        <section className="container py-4 py-lg-5" id="inicio">
          <div className="welcome-panel p-4 p-lg-5 mb-4">
            <div className="row align-items-center g-4">
              <div className="col-lg-8">
                <span className="eyebrow">CONOCE ROOTTASK</span>
                <h1 className="display-5 fw-bold mt-2 mb-3">Tus tareas claras.<br className="d-none d-md-block" /> Tu estudio bajo control.</h1>
                <p className="lead mb-4">RootTask es un espacio para organizar tus actividades académicas y planificar entregas. Evita olvidos y reduce el estrés de no saber qué debes hacer primero.</p>
                <Link className="btn btn-primary btn-lg" to="/cuenta">Empezar ahora <span aria-hidden="true">→</span></Link>
              </div>
              <div className="col-lg-4 d-none d-lg-block text-center" aria-hidden="true">
                <div className="hero-note">
                  <span className="hero-note-icon">✓</span>
                  <strong>Un paso a la vez</strong>
                  <span>Tu semana, más clara.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-3 mb-4" aria-label="Qué ofrece RootTask">
            <div className="col-12 col-md-4"><div className="summary-card h-100"><span className="summary-icon purple-icon" aria-hidden="true">▣</span><div><span className="summary-label">¿Qué es RootTask?</span><strong>Tu organizador académico</strong></div></div></div>
            <div className="col-12 col-md-4"><div className="summary-card h-100"><span className="summary-icon blue-icon" aria-hidden="true">◷</span><div><span className="summary-label">¿Para qué sirve?</span><strong>Planifica tareas y entregas</strong></div></div></div>
            <div className="col-12 col-md-4"><div className="summary-card h-100"><span className="summary-icon green-icon" aria-hidden="true">✓</span><div><span className="summary-label">¿Qué problema resuelve?</span><strong>Olvidos y desorganización</strong></div></div></div>
          </div>
        </section>
      </main>
      <footer className="site-footer py-4">
        <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
          <Link className="navbar-brand fw-bold brand mb-0" to="/"><span className="brand-mark">R</span> RootTask</Link>
          <span>Organiza tu estudio, un día a la vez.</span>
        </div>
      </footer>
    </>
  );
}

function Access({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [values, setValues] = useState({ username: "", email: "", password: "", occupation: "", profession: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const selectedOccupation = occupationProfiles[values.occupation];

  async function submit(event) {
    event.preventDefault();
    if (mode === "register" && values.password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { user } = await api(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      onLogin(user);
      navigate("/mis-tareas");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function changeMode(nextMode) {
    setError("");
    setConfirmPassword("");
    setMode(nextMode);
  }

  return (
    <main className="auth-page" id="acceso">
      <div className="container auth-layout">
        <section className="auth-story" aria-label="Organiza tus estudios con RootTask">
          <Link className="auth-story-brand" to="/"><span className="brand-mark">R</span> RootTask</Link>
          <div className="auth-story-copy">
            <span className="auth-story-kicker"><span className="status-dot" /> TU ESPACIO PARA AVANZAR</span>
            <h1>{mode === "login" ? "Qué bueno verte de nuevo." : "Empieza con un plan."}</h1>
            <p>{mode === "register"
              ? selectedOccupation
                ? `${selectedOccupation.description} ${values.profession.trim() ? `Personalizaremos tu espacio para ${values.profession.trim()}.` : ""}`
                : "Cuéntanos a qué te dedicas y adaptaremos tu espacio para organizar tus responsabilidades."
              : "Organiza entregas, crea buenos hábitos y dedica tu energía a lo que más importa."}</p>
            <div className="auth-benefits">
              <div><span aria-hidden="true">✓</span><span>Tus tareas, siempre en orden</span></div>
              <div><span aria-hidden="true">✓</span><span>Fechas y avisos en un solo lugar</span></div>
              <div><span aria-hidden="true">✓</span><span>Una organización que se adapta a ti</span></div>
            </div>
          </div>
          <div className="auth-story-note"><span className="story-note-icon">✦</span><span><strong>Un paso a la vez</strong><small>La constancia también cuenta.</small></span></div>
          <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
          <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
        </section>

        <section className="auth-form-wrap" aria-labelledby="access-heading">
          <div className="auth-form-card">
            <div className="auth-form-heading">
              <span className="eyebrow">BIENVENIDO/A A ROOTTASK</span>
              <h2 id="access-heading">{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>
              <p>{mode === "login" ? "Ingresa tus datos para continuar con tu planificación." : "Completa tus datos y empieza a organizar tus tareas."}</p>
            </div>

            <div className="auth-mode-switch" role="group" aria-label="Tipo de acceso">
              <button className={mode === "login" ? "active" : ""} type="button" aria-pressed={mode === "login"} onClick={() => changeMode("login")}>Iniciar sesión</button>
              <button className={mode === "register" ? "active" : ""} type="button" aria-pressed={mode === "register"} onClick={() => changeMode("register")}>Registrarme</button>
            </div>

            <form onSubmit={submit} aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}>
              {mode === "register" && (
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Nombre</label>
                  <input className="form-control auth-input" id="username" name="username" placeholder="¿Cómo te llamas?" autoComplete="name" minLength="2" maxLength="40" value={values.username} onChange={update} required />
                </div>
              )}
              {mode === "register" && (
                <>
                  <div className="mb-3">
                    <label htmlFor="occupation" className="form-label">¿A qué te dedicas?</label>
                    <select className="form-select auth-input" id="occupation" name="occupation" value={values.occupation} onChange={update} required>
                      <option value="" disabled>Selecciona tu ocupación</option>
                      <option value="student">Estudio</option>
                      <option value="employee">Trabajo</option>
                      <option value="independent">Trabajo de forma independiente</option>
                      <option value="both">Estudio y trabajo</option>
                      <option value="other">Otra ocupación</option>
                    </select>
                  </div>
                  {values.occupation && (
                    <div className="mb-3">
                      <label htmlFor="profession" className="form-label">
                        {values.occupation === "student" ? "¿Qué estudias?" : "¿Cuál es tu profesión o área?"}
                        <span className="optional-label"> Opcional</span>
                      </label>
                      <input className="form-control auth-input" id="profession" name="profession" placeholder={values.occupation === "student" ? "Ej. Enfermería, informática" : "Ej. Diseño, ventas, cocina"} maxLength="80" value={values.profession} onChange={update} />
                    </div>
                  )}
                </>
              )}
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Correo electrónico</label>
                <input className="form-control auth-input" id="email" name="email" type="email" placeholder="tu@correo.com" autoComplete="email" maxLength="254" value={values.email} onChange={update} required />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Contraseña</label>
                <div className="password-field">
                  <input className="form-control auth-input" id="password" name="password" type={showPassword ? "text" : "password"} placeholder={mode === "register" ? "Crea una contraseña segura" : "Ingresa tu contraseña"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 8 : undefined} maxLength="128" value={values.password} onChange={update} required />
                  <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Mostrar"}</button>
                </div>
                {mode === "register" && <small className="auth-hint">Usa al menos 8 caracteres.</small>}
              </div>
              {mode === "register" && (
                <div className="mb-3">
                  <label htmlFor="confirm-password" className="form-label">Confirmar contraseña</label>
                  <input className="form-control auth-input" id="confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Escríbela de nuevo" autoComplete="new-password" maxLength="128" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </div>
              )}
              {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
              <button className="btn btn-primary auth-submit w-100" disabled={busy} type="submit">
                {busy ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Procesando…</> : mode === "login" ? "Iniciar sesión" : "Crear mi cuenta"}
                {!busy && <span aria-hidden="true">→</span>}
              </button>
            </form>
            <p className="auth-switch-copy">
              {mode === "login" ? "¿Todavía no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
              <button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Regístrate gratis" : "Inicia sesión"}</button>
            </p>
            <div className="auth-security"><span aria-hidden="true">▣</span> Tus datos se almacenan de forma segura.</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Tasks({ user, onUnauthorized }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [values, setValues] = useState({ title: "", category: "", dueDate: "" });
  const profile = getOccupationProfile(user);
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const activeTasks = tasks.filter((task) => task.status !== "completed");
  const overdueTasks = activeTasks.filter((task) => task.dueDate < todayString);
  const visibleTasks = tasks.filter((task) => (
    filter === "all"
    || (filter === "overdue" && task.status !== "completed" && task.dueDate < todayString)
    || task.status === filter
  ));

  useEffect(() => {
    api("/api/tasks")
      .then(({ tasks: loadedTasks }) => setTasks(loadedTasks))
      .catch((requestError) => {
        if (requestError.message === "Inicia sesión para continuar.") onUnauthorized();
        else setError(requestError.message);
      })
      .finally(() => setLoading(false));
  }, [onUnauthorized]);

  async function addTask(event) {
    event.preventDefault();
    setError("");
    try {
      const { task } = await api("/api/tasks", { method: "POST", body: JSON.stringify(values) });
      setTasks((current) => [...current, task].sort((a, b) => (
        Number(a.status === "completed") - Number(b.status === "completed")
        || a.dueDate.localeCompare(b.dueDate)
      )));
      setValues({ title: "", category: "", dueDate: "" });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateTaskStatus(task, status) {
    setError("");
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteTask(id) {
    setError("");
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((current) => current.filter((task) => task.id !== id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="section-tint py-5">
      <div className="container">
        <div className="section-heading mb-4">
          <div>
            <span className="eyebrow">TU ESPACIO PERSONAL · {profile.label.toUpperCase()}</span>
            <h1 className="section-title">{profile.heading}</h1>
            <p className="section-description mb-2">{profile.description}</p>
            {user.profession && <span className="profile-specialty">{user.profession}</span>}
          </div>
        </div>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {!loading && activeTasks.length > 0 && (
          <section className={`task-reminder mb-4${overdueTasks.length ? " has-overdue" : ""}`} aria-live="polite" aria-label="Resumen de tareas pendientes">
            <span className="task-reminder-icon" aria-hidden="true">{overdueTasks.length ? "!" : "✓"}</span>
            <div>
              <strong>
                {overdueTasks.length
                  ? `Tienes ${overdueTasks.length} ${overdueTasks.length === 1 ? "tarea vencida" : "tareas vencidas"}`
                  : `Tienes ${activeTasks.length} ${activeTasks.length === 1 ? "tarea pendiente" : "tareas pendientes"}`}
              </strong>
              <p>
                {overdueTasks.length
                  ? "Siguen aquí hasta que las marques como completadas."
                  : `${activeTasks.length === 1 ? "Tu pendiente sigue" : "Tus pendientes siguen"} aquí hasta que ${activeTasks.length === 1 ? "la completes" : "los completes"}.`}
              </p>
            </div>
            {overdueTasks.length > 0 && <button className="btn btn-sm reminder-action" type="button" onClick={() => setFilter("overdue")}>Ver vencidas</button>}
          </section>
        )}
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <section className="content-card h-100" aria-labelledby="list-heading">
              <h2 className="card-title" id="list-heading">{profile.listTitle} <span className="count-pill ms-2">{tasks.length}</span></h2>
              <div className="task-filters" aria-label="Filtrar tareas">
                {[
                  ["all", "Todas", tasks.length],
                  ["pending", "Pendientes", tasks.filter((task) => task.status === "pending").length],
                  ["in_progress", "En progreso", tasks.filter((task) => task.status === "in_progress").length],
                  ["overdue", "Vencidas", overdueTasks.length],
                  ["completed", "Completadas", tasks.filter((task) => task.status === "completed").length],
                ].map(([value, label, count]) => (
                  <button className={`task-filter${filter === value ? " active" : ""}`} key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                    {label}<span>{count}</span>
                  </button>
                ))}
              </div>
              <div className="task-list-heading d-none d-sm-grid"><span>ACTIVIDAD</span><span>CATEGORÍA</span><span>ENTREGA</span><span>ESTADO</span><span></span></div>
              {loading ? <p className="text-secondary mb-0">Cargando tus tareas…</p> : visibleTasks.length ? visibleTasks.map((task) => {
                const isOverdue = task.status !== "completed" && task.dueDate < todayString;
                return (
                  <div className={`task-row${task.status === "completed" ? " task-completed" : ""}${isOverdue ? " task-overdue" : ""}`} key={task.id}>
                    <div className="task-name"><span className={`task-status-mark ${task.status}`} aria-hidden="true">{task.status === "completed" ? "✓" : task.status === "in_progress" ? "↻" : "•"}</span><span>{task.title}</span></div>
                    <span className="category-tag">{task.category}</span>
                    <div className="task-deadline">
                      <time dateTime={task.dueDate}>{new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${task.dueDate}T00:00:00Z`))}</time>
                      {isOverdue && <small>Vencida</small>}
                    </div>
                    <select className={`form-select form-select-sm task-status-select ${task.status}`} aria-label={`Estado de ${task.title}`} value={task.status} onChange={(event) => updateTaskStatus(task, event.target.value)}>
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En progreso</option>
                      <option value="completed">✓ Completada</option>
                    </select>
                    <button className="btn btn-sm btn-outline-danger task-delete" type="button" onClick={() => deleteTask(task.id)} aria-label={`Eliminar ${task.title}`}>×</button>
                  </div>
                );
              }) : <p className="text-secondary mb-0">{tasks.length ? "No hay tareas en este estado." : "Aún no tienes tareas. Agrega la primera en el formulario."}</p>}
            </section>
          </div>
          <div className="col-12 col-lg-5">
            <section className="content-card h-100" aria-labelledby="new-task-heading">
              <h2 className="card-title" id="new-task-heading">{profile.newTaskTitle}</h2>
              <form onSubmit={addTask}>
                <div className="mb-3"><label htmlFor="task-title" className="form-label">Actividad</label><input type="text" className="form-control" id="task-title" maxLength="120" placeholder={profile.taskPlaceholder} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} required /></div>
                <div className="mb-3"><label htmlFor="task-category" className="form-label">{profile.categoryLabel}</label><input type="text" className="form-control" id="task-category" maxLength="60" placeholder={profile.categoryPlaceholder} value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} required /></div>
                <div className="mb-3"><label htmlFor="due-date" className="form-label">Fecha de entrega</label><input type="date" className="form-control" id="due-date" value={values.dueDate} onChange={(event) => setValues({ ...values, dueDate: event.target.value })} required /></div>
                <button className="btn btn-primary w-100" type="submit">Guardar tarea</button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api("/api/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error) => {
        console.error(error);
        setUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/");
  }

  const redirectToLogin = useCallback(() => {
    setUser(null);
    navigate("/cuenta");
  }, [navigate]);

  return (
    <>
      <Navbar user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cuenta" element={checkingSession ? <p className="container py-5">Cargando…</p> : user ? <Navigate to="/mis-tareas" replace /> : <Access onLogin={setUser} />} />
        <Route path="/mis-tareas" element={checkingSession ? <p className="container py-5">Cargando…</p> : user ? <Tasks user={user} onUnauthorized={redirectToLogin} /> : <Navigate to="/cuenta" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

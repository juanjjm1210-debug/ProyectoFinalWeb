import express from "express";
import { scrypt, timingSafeEqual, createHmac, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { all, checkDatabase, databaseDialect, get, initializeDatabase, run } from "./server/db.js";

const app = express();
const scryptAsync = promisify(scrypt);
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "local-development-secret-change-before-deploy");
const cookieName = "roottask_session";
const sessionDurationSeconds = 60 * 60 * 24 * 7;
const occupations = new Set(["student", "employee", "independent", "both", "other"]);

if (!sessionSecret) {
  throw new Error("SESSION_SECRET debe configurarse antes de iniciar en producción.");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", async (_req, res) => {
  await checkDatabase();
  res.json({ status: "ok" });
});

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${Buffer.from(key).toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [saltHex, keyHex] = storedHash.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = Buffer.from(await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readSession(token) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", sessionSecret).update(encoded).digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return Number.isInteger(payload.id) && payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function setSessionCookie(res, userId) {
  const token = signPayload({ id: userId, exp: Date.now() + sessionDurationSeconds * 1000 });
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: sessionDurationSeconds * 1000,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" });
}

function requireAuth(req, res, next) {
  const sessionCookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  const session = readSession(sessionCookie?.slice(cookieName.length + 1));
  if (!session) return sendError(res, 401, "Inicia sesión para continuar.");
  req.userId = session.id;
  next();
}

function validateTask(body) {
  body = body ?? {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const dueDate = typeof body.dueDate === "string" ? body.dueDate : "";

  if (!title || title.length > 120) return "El título es obligatorio y debe tener máximo 120 caracteres.";
  if (!category || category.length > 60) return "La categoría es obligatoria y debe tener máximo 60 caracteres.";
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? Date.parse(`${dueDate}T00:00:00Z`) : Number.NaN;
  if (Number.isNaN(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== dueDate) {
    return "Ingresa una fecha de entrega válida.";
  }
  return null;
}

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const occupation = typeof body.occupation === "string" ? body.occupation : "";
    const profession = typeof body.profession === "string" ? body.profession.trim() : "";

    if (username.length < 2 || username.length > 40) return sendError(res, 400, "El usuario debe tener entre 2 y 40 caracteres.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return sendError(res, 400, "Ingresa un correo electrónico válido.");
    if (password.length < 8 || password.length > 128) return sendError(res, 400, "La contraseña debe tener entre 8 y 128 caracteres.");
    if (!occupations.has(occupation)) return sendError(res, 400, "Selecciona a qué te dedicas.");
    if (profession.length > 80) return sendError(res, 400, "El área o profesión debe tener máximo 80 caracteres.");

    const passwordHash = await hashPassword(password);
    let result;
    try {
      result = await run(`
        INSERT INTO users (username, email, password_hash, occupation, profession)
        VALUES (?, ?, ?, ?, ?)
      `, [username, email, passwordHash, occupation, profession]);
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "23505") return sendError(res, 409, "Ya existe una cuenta con ese correo.");
      throw error;
    }

    setSessionCookie(res, Number(result.lastInsertRowid));
    res.status(201).json({ user: { id: Number(result.lastInsertRowid), username, email, occupation, profession } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = await get("SELECT id, username, email, password_hash, occupation, profession FROM users WHERE email = ?", [email]);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return sendError(res, 401, "Correo o contraseña incorrectos.");
    }
    setSessionCookie(res, Number(user.id));
    res.json({ user: { id: Number(user.id), username: user.username, email: user.email, occupation: user.occupation, profession: user.profession } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

app.get("/api/auth/me", async (req, res) => {
  const sessionCookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  const session = readSession(sessionCookie?.slice(cookieName.length + 1));
  if (!session) return res.json({ user: null });
  const user = await get("SELECT id, username, email, occupation, profession FROM users WHERE id = ?", [session.id]);
  if (!user) {
    clearSessionCookie(res);
    return res.json({ user: null });
  }
  res.json({ user: { ...user, id: Number(user.id) } });
});

app.get("/api/tasks", requireAuth, async (req, res) => {
  const tasks = await all(`
    SELECT id, title, category, due_date AS "dueDate", status
    FROM tasks WHERE user_id = ?
    ORDER BY CASE status WHEN 'completed' THEN 1 ELSE 0 END, due_date, id
  `, [req.userId]);
  res.json({ tasks });
});

app.post("/api/tasks", requireAuth, async (req, res) => {
  const error = validateTask(req.body);
  if (error) return sendError(res, 400, error);
  const result = await run(`
    INSERT INTO tasks (user_id, title, category, due_date, status)
    VALUES (?, ?, ?, ?, 'pending')
  `, [req.userId, req.body.title.trim(), req.body.category.trim(), req.body.dueDate]);
  const task = await get(`
    SELECT id, title, category, due_date AS "dueDate", status
    FROM tasks WHERE id = ? AND user_id = ?
  `, [result.lastInsertRowid, req.userId]);
  res.status(201).json({ task });
});

app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 400, "Identificador de tarea inválido.");
  const status = req.body?.status;
  if (!["pending", "in_progress", "completed"].includes(status)) {
    return sendError(res, 400, "Selecciona un estado válido para la tarea.");
  }
  const result = databaseDialect === "postgres"
    ? await run("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?", [status, id, req.userId])
    : await run("UPDATE tasks SET status = ?, completed = ? WHERE id = ? AND user_id = ?", [status, Number(status === "completed"), id, req.userId]);
  if (!result.changes) return sendError(res, 404, "No se encontró la tarea.");
  res.json({ success: true, status });
});

app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 400, "Identificador de tarea inválido.");
  const result = await run("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, req.userId]);
  if (!result.changes) return sendError(res, 404, "No se encontró la tarea.");
  res.status(204).end();
});

if (isProduction) {
  const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "public");
  app.use(express.static(frontendDirectory));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve(frontendDirectory, "index.html")));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  sendError(res, 500, "Ocurrió un error inesperado. Inténtalo de nuevo.");
});

await initializeDatabase();

export default app;

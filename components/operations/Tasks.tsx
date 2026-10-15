"use client";

import { useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { todayISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { PRIORITIES, TASK_STATUSES, ENTITY_TYPES } from "@/lib/options";

export type TaskRecord = { id: string; title: string; assigned_to_id: string | null; assigned_to_name?: string; priority: string; status: string; due_date: string; related_entity_type: string; related_entity_label: string | null };
type User = { id: string; name: string };

function TaskModal({ open, onClose, task, userId, userName, users, isAdmin }: { open: boolean; onClose: () => void; task?: TaskRecord; userId: string; userName: string; users: User[]; isAdmin: boolean }) {
  const { run, busy, error, setError } = useAction();
  async function submit(fd: FormData) {
    const title = String(fd.get("title") || "").trim();
    if (!title) return setError("Informe a tarefa.");
    // Sem permissão de administrador a tarefa fica com o próprio usuário (RLS).
    const assignedId = isAdmin ? String(fd.get("assigned_to_id") || userId) : task?.assigned_to_id ?? userId;
    const payload = {
      title,
      assigned_to_id: assignedId,
      assigned_to_name: users.find((u) => u.id === assignedId)?.name ?? task?.assigned_to_name ?? userName,
      priority: String(fd.get("priority") || "media"),
      status: String(fd.get("status") || "pendente"),
      due_date: String(fd.get("due_date") || todayISO()),
      related_entity_type: String(fd.get("related_entity_type") || "cliente"),
      related_entity_label: String(fd.get("related_entity_label") || "").trim(),
    };
    const supabase = createClient();
    await run(async () => (task ? supabase.from("tasks").update(payload).eq("id", task.id) : supabase.from("tasks").insert({ ...payload, created_by: userId })), { onSuccess: onClose });
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Editar tarefa" : "Nova tarefa"}
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`task-${task?.id ?? "new"}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : task ? "Salvar" : "Criar tarefa"}</button></>}
    >
      <form id={`task-${task?.id ?? "new"}`} action={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Tarefa" className="sm:col-span-2"><Input name="title" defaultValue={task?.title} required autoFocus /></Field>
        <Field label="Responsável" hint={isAdmin ? undefined : "Somente a administração distribui tarefas."}>
          <Select name="assigned_to_id" defaultValue={task?.assigned_to_id ?? userId} disabled={!isAdmin}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            {!users.some((u) => u.id === (task?.assigned_to_id ?? userId)) && <option value={task?.assigned_to_id ?? userId}>{task?.assigned_to_name ?? userName}</option>}
          </Select>
        </Field>
        <Field label="Prazo"><Input name="due_date" type="date" defaultValue={task?.due_date ?? todayISO()} required /></Field>
        <Field label="Prioridade"><Select name="priority" defaultValue={task?.priority ?? "media"}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
        <Field label="Status"><Select name="status" defaultValue={task?.status ?? "pendente"}>{TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <Field label="Vinculada a"><Select name="related_entity_type" defaultValue={task?.related_entity_type ?? "cliente"}>{ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <Field label="Nome do vínculo (opcional)" hint="Ex.: nome do cliente, para aparecer na ficha."><Input name="related_entity_label" defaultValue={task?.related_entity_label ?? ""} /></Field>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  );
}

type Shared = { userId: string; userName: string; users: User[]; isAdmin: boolean };

export function CreateTaskButton(props: Shared) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Nova tarefa</button>
      {open && <TaskModal open onClose={() => setOpen(false)} {...props} />}
    </>
  );
}

export function TaskActions({ task, ...shared }: Shared & { task: TaskRecord }) {
  const [open, setOpen] = useState(false);
  const { run, busy, error } = useAction();
  const done = task.status === "concluida";
  return (
    <span className="inline-flex items-center gap-1">
      <IconButton label={done ? "Reabrir tarefa" : "Concluir tarefa"} disabled={busy} onClick={() => run(async () => createClient().from("tasks").update({ status: done ? "pendente" : "concluida" }).eq("id", task.id))} className={done ? "" : "text-success hover:bg-success/10 hover:text-success"}>
        {done ? <RotateCcw size={14} /> : <Check size={15} />}
      </IconButton>
      <IconButton label="Editar tarefa" onClick={() => setOpen(true)}><Pencil size={14} /></IconButton>
      <IconButton label="Excluir tarefa" tone="danger" disabled={busy} onClick={() => window.confirm(`Excluir a tarefa "${task.title}"?`) && run(async () => createClient().from("tasks").delete().eq("id", task.id))}><Trash2 size={14} /></IconButton>
      {error && <span role="alert" className="max-w-[200px] whitespace-normal text-xs text-danger">{error}</span>}
      {open && <TaskModal open onClose={() => setOpen(false)} task={task} {...shared} />}
    </span>
  );
}

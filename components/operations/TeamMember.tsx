"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { onSubmitForm, useAction } from "@/lib/hooks/useAction";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { ROLES } from "@/lib/options";
import { useConfirm } from "@/components/ui/Feedback";

type Member = { id: string; name: string; email: string; role: string; active: boolean; avatar_initials: string | null };

export function TeamMemberEdit({ member }: { member: Member }) {
  const confirmDialog = useConfirm();
  const [open, setOpen] = useState(false);
  const { run, busy, error, fieldErrors, fail } = useAction();
  async function submit(fd: FormData) {
    const name = String(fd.get("name") || "").trim();
    if (!name) return fail({ name: "Informe o nome." });
    const active = fd.get("active") === "true";
    if (!active && !(await confirmDialog({ description: `Desativar ${name}? A pessoa perde o acesso ao KORVIX OS no próximo carregamento.`, title: "Desativar acesso", confirmLabel: "Desativar" }))) return;
    await run(
      async () =>
        createClient().from("users").update({
          name,
          role: String(fd.get("role")),
          active,
          avatar_initials: String(fd.get("avatar_initials") || "").trim().toUpperCase().slice(0, 2) || null,
        }).eq("id", member.id),
      { onSuccess: () => setOpen(false), success: "Membro da equipe atualizado." },
    );
  }
  return (
    <>
      <IconButton label={`Editar ${member.name}`} onClick={() => setOpen(true)}><Pencil size={15} /></IconButton>
      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title="Editar membro da equipe"
          description={member.email}
          size="sm"
          footer={<><button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`member-${member.id}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button></>}
        >
          <form id={`member-${member.id}`} onSubmit={onSubmitForm(submit)} className="space-y-4">
            <Field label="Nome" error={fieldErrors.name}><Input name="name" defaultValue={member.name} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Papel" error={fieldErrors.role}>
                <Select name="role" defaultValue={member.role}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  {!ROLES.some((r) => r.value === member.role) && <option value={member.role}>{member.role}</option>}
                </Select>
              </Field>
              <Field label="Iniciais" error={fieldErrors.avatar_initials}><Input name="avatar_initials" defaultValue={member.avatar_initials ?? ""} maxLength={2} /></Field>
            </div>
            <Field label="Acesso" error={fieldErrors.active}><Select name="active" defaultValue={String(member.active)}><option value="true">Ativo</option><option value="false">Inativo</option></Select></Field>
            <FormError message={error} />
          </form>
        </Modal>
      )}
    </>
  );
}

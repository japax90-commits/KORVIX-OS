"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ConfirmPaymentButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!window.confirm("Confirmar este pagamento como pago?")) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("id,client_id,client_name,amount,type,status")
        .eq("id", id)
        .single();
      if (paymentError || !payment) throw new Error(paymentError?.message ?? "Pagamento não encontrado.");
      if (payment.status === "pago") return;

      const { data: opportunity } = await supabase
        .from("opportunities")
        .select("closing_user_id,origin_owner_id")
        .eq("client_name", payment.client_name)
        .in("stage", ["ganho", "fechado_ganho"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const vendorId = opportunity?.closing_user_id ?? opportunity?.origin_owner_id ?? null;
      let vendorName = "";
      if (vendorId) {
        const { data: vendor } = await supabase.from("users").select("name").eq("id", vendorId).maybeSingle();
        vendorName = vendor?.name ?? "";
      }

      const amount = Number(payment.amount) || 0;
      const percentage = payment.type === "primeira_venda" ? 50 : payment.type === "recorrencia" ? 10 : 0;
      const commissionAmount = amount * (percentage / 100);
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "pago", paid_at: now })
        .eq("id", id)
        .neq("status", "pago");
      if (updateError) throw new Error(updateError.message);

      if (percentage > 0 && vendorId && commissionAmount > 0) {
        const { data: existingCommission } = await supabase.from("commissions").select("id").eq("payment_id", id).maybeSingle();
        if (!existingCommission) {
          const { error: commissionError } = await supabase.from("commissions").insert({
            payment_id: id,
            vendor_id: vendorId,
            vendor_name: vendorName || "Vendedor não identificado",
            amount: commissionAmount,
            percentage,
            status: "liberada",
            client_name: payment.client_name,
          });
          if (commissionError) throw new Error(commissionError.message);
        }
      }

      const cashDescription = `Pagamento de ${payment.client_name} · ${id}`;
      const { data: existingCash } = await supabase.from("cash_movements").select("id").eq("description", cashDescription).maybeSingle();
      if (!existingCash && amount > 0) {
        const { error: cashError } = await supabase.from("cash_movements").insert({
          category: "Receita",
          direction: "entrada",
          amount,
          description: cashDescription,
          movement_date: new Date().toISOString().slice(0, 10),
          created_by: vendorId,
        });
        if (cashError) throw new Error(cashError.message);
      }

      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.");
    } finally {
      setBusy(false);
    }
  }

  return <button disabled={busy} onClick={confirm} className="text-xs font-medium text-korvix-600">{busy ? "Confirmando..." : "Confirmar"}</button>;
}

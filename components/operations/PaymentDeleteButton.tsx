"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
export function PaymentDeleteButton({id}:{id:string}){const[busy,setBusy]=useState(false);async function remove(){if(!confirm("Excluir este pagamento? Se ele estiver pago, o caixa e as comissões serão revertidos."))return;setBusy(true);const{error}=await createClient().rpc("delete_payment_and_sync_finance",{p_payment_id:id});if(error)alert(error.message);else location.reload();setBusy(false)}return <button disabled={busy} onClick={remove} title="Excluir pagamento" className="text-danger hover:opacity-70"><Trash2 size={15}/></button>}

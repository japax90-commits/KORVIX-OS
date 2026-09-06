"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function ConfirmPaymentButton({id}:{id:string}){const[busy,setBusy]=useState(false);async function confirm(){if(!window.confirm("Confirmar este pagamento como pago?"))return;setBusy(true);const{error}=await createClient().from("payments").update({status:"pago",paid_at:new Date().toISOString()}).eq("id",id);if(error)alert(error.message);else window.location.reload();setBusy(false)}return <button disabled={busy} onClick={confirm} className="text-xs font-medium text-korvix-600">{busy?"Confirmando...":"Confirmar"}</button>}

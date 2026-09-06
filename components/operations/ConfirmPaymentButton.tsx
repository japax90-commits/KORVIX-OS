"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function ConfirmPaymentButton({id}:{id:string}){const[busy,setBusy]=useState(false);async function confirm(){if(!window.confirm("Confirmar este pagamento como pago?"))return;setBusy(true);try{const{error}=await createClient().rpc("confirm_payment_and_sync_finance",{p_payment_id:id});if(error)throw new Error(error.message);window.location.reload()}catch(e){alert(e instanceof Error?e.message:"Não foi possível confirmar o pagamento.")}finally{setBusy(false)}}return <button disabled={busy} onClick={confirm} className="text-xs font-medium text-korvix-600">{busy?"Confirmando...":"Confirmar"}</button>}

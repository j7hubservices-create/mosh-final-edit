import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingUpdateRequest {
  orderId?: string; // Optional: if not provided, update all pending/shipped orders
}

// Utility: fetch tracking info from client’s delivery API
async function fetchTracking(trackingNumber: string, reference: string, apiKey: string) {
  const trackingApiUrl = "https://api.deliverytracking.com/v1/track"; // Replace with actual API endpoint
  try {
    const response = await fetch(trackingApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ tracking_number: trackingNumber, order_reference: reference }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("Delivery API fetch error:", err);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId }: TrackingUpdateRequest = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Determine which orders to update
    let ordersQuery = supabase.from("orders").select("*");
    if (orderId) ordersQuery = ordersQuery.eq("id", orderId);
    else ordersQuery = ordersQuery.in("tracking_status", ["pending", "shipped"]);

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0)
      return new Response(
        JSON.stringify({ success: true, message: "No orders to update" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    const apiKey = Deno.env.get("DELIVERY_TRACKING_API_KEY") ?? "";
    const updatedOrders = [];

    for (const order of orders) {
      let trackingNumber = order.tracking_number;
      if (!trackingNumber) {
        trackingNumber = `MOSH${Date.now()}`;
        await supabase.from("orders").update({ tracking_number: trackingNumber }).eq("id", order.id);
      }

      // Fetch tracking info from delivery API
      const trackingData = await fetchTracking(
        trackingNumber,
        order.order_number || order.id.substring(0, 8),
        apiKey
      );
      let status = trackingData?.status || order.tracking_status || "pending";

      // Update order with latest tracking info
      await supabase.from("orders").update({
        tracking_status: status,
        tracking_updated_at: new Date().toISOString(),
        tracking_details: trackingData ? JSON.stringify(trackingData) : order.tracking_details,
      }).eq("id", order.id);

      // Add tracking history log
      await supabase.from("order_tracking_history").insert({
        order_id: order.id,
        status,
        details: trackingData ? JSON.stringify(trackingData) : null,
        updated_at: new Date().toISOString(),
      });

      updatedOrders.push({ id: order.id, tracking_number: trackingNumber, tracking_status: status });
    }

    return new Response(JSON.stringify({ success: true, updatedOrders }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in delivery-tracking function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

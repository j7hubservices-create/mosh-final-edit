import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingUpdateRequest {
  orderId?: string; // optional for bulk updates
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: TrackingUpdateRequest = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch either a single order or all pending/shipped orders
    let orders;
    if (orderId) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (error || !order) throw new Error("Order not found");
      orders = [order];
    } else {
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("*")
        .in("tracking_status", ["pending", "shipped"]);
      if (error) throw new Error("Failed fetching orders");
      orders = allOrders || [];
    }

    const trackingApiKey = Deno.env.get("DELIVERY_TRACKING_API_KEY");
    const trackingApiUrl = "https://api.deliverytracking.com/v1/track";

    const results = [];

    for (const order of orders) {
      let trackingNumber = order.tracking_number;
      if (!trackingNumber) {
        trackingNumber = `MOSH${Date.now()}${Math.floor(Math.random() * 999)}`;
        await supabase
          .from("orders")
          .update({ tracking_number: trackingNumber })
          .eq("id", order.id);
      }

      let trackingStatus = order.tracking_status || "pending";
      let trackingDetails = null;

      try {
        const response = await fetch(trackingApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${trackingApiKey}`,
          },
          body: JSON.stringify({
            tracking_number: trackingNumber,
            order_reference: order.order_number || order.id.substring(0, 8),
          }),
        });

        if (response.ok) {
          trackingDetails = await response.json();
          trackingStatus = trackingDetails.status || trackingStatus;
        }
      } catch (apiError) {
        console.error("Tracking API error:", apiError);
      }

      // Update order status
      await supabase
        .from("orders")
        .update({
          tracking_status: trackingStatus,
          tracking_updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Log tracking history
      await supabase.from("order_tracking_history").insert({
        order_id: order.id,
        tracking_number: trackingNumber,
        status: trackingStatus,
        details: trackingDetails,
        updated_at: new Date().toISOString(),
      });

      results.push({
        orderId: order.id,
        tracking_number: trackingNumber,
        tracking_status: trackingStatus,
        tracking_details: trackingDetails,
      });

      console.log(`Tracking updated for order ${order.id}: ${trackingStatus}`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
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

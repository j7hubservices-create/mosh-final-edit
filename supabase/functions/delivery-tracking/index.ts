import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackingUpdateRequest {
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: TrackingUpdateRequest = await req.json();
    console.log(`Fetching tracking info for order ${orderId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // If order doesn't have a tracking number, generate one
    let trackingNumber = order.tracking_number;
    if (!trackingNumber) {
      trackingNumber = `MOSH${Date.now()}`;
      await supabase
        .from("orders")
        .update({ tracking_number: trackingNumber })
        .eq("id", orderId);
    }

    // Call delivery tracking API
    const trackingApiKey = Deno.env.get("DELIVERY_TRACKING_API_KEY");
    const trackingApiUrl = "https://api.deliverytracking.com/v1/track"; // Example API endpoint

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
      // Continue with mock tracking if API fails
    }

    // Update tracking status in database
    await supabase
      .from("orders")
      .update({
        tracking_status: trackingStatus,
        tracking_updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    console.log(`Tracking updated for order ${orderId}: ${trackingStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        tracking_number: trackingNumber,
        tracking_status: trackingStatus,
        tracking_details: trackingDetails,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in delivery-tracking function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

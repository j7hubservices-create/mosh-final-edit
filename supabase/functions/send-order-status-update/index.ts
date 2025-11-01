import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusUpdateRequest {
  orderId: string;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status }: StatusUpdateRequest = await req.json();
    console.log(`Sending status update for order ${orderId}: ${status}`);

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

    const statusMessages: Record<string, { title: string; message: string; emoji: string }> = {
      confirmed: {
        title: "Payment Confirmed",
        message: "We've confirmed your payment! Your order is now being prepared.",
        emoji: "✅",
      },
      processing: {
        title: "Order Processing",
        message: "Your order is being carefully prepared for delivery.",
        emoji: "📦",
      },
      shipped: {
        title: "Order Shipped",
        message: "Great news! Your order is on its way to you.",
        emoji: "🚚",
      },
      delivered: {
        title: "Order Delivered",
        message: "Your order has been delivered! We hope you love your new items.",
        emoji: "🎉",
      },
      cancelled: {
        title: "Order Cancelled",
        message: "Your order has been cancelled as requested. If this was a mistake, please contact us.",
        emoji: "❌",
      },
    };

    const statusInfo = statusMessages[status] || {
      title: "Order Status Update",
      message: `Your order status has been updated to: ${status}`,
      emoji: "ℹ️",
    };

    const { data, error } = await resend.emails.send({
      from: "Mosh Apparels <orders@resend.dev>",
      to: [order.customer_email],
      subject: `${statusInfo.emoji} ${statusInfo.title} - Order #${order.order_number || order.id.substring(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-badge { display: inline-block; padding: 10px 20px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .order-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusInfo.emoji} ${statusInfo.title}</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name},</p>
              <p>${statusInfo.message}</p>
              
              <div class="order-info">
                <h3>Order Information</h3>
                <p><strong>Order Number:</strong> ${order.order_number || order.id.substring(0, 8)}</p>
                <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>
                <p><strong>Status:</strong> <span class="status-badge">${status.toUpperCase()}</span></p>
              </div>

              ${
                status === "shipped"
                  ? `
              <div class="order-info">
                <h3>Delivery Information</h3>
                <p>Your order will be delivered to:</p>
                <p><strong>${order.customer_address}</strong></p>
                <p>Please ensure someone is available to receive the package.</p>
              </div>
              `
                  : ""
              }

              <p>If you have any questions about your order, please don't hesitate to contact us.</p>
              <p><strong>The Mosh Apparels Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 Mosh Apparels. All rights reserved.</p>
              <p>9, Bolanle Awosika Street, Coca Cola Road, Oju Oore, Ota, Ogun State</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending status update:", error);
      throw error;
    }

    console.log("Status update email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-status-update function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

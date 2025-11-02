import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: OrderConfirmationRequest = await req.json();
    console.log("Sending order confirmation for order:", orderId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*))")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const itemsHtml = order.order_items
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.products.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const deliveryMethodText = 
      order.delivery_method === "doorstep" ? "Doorstep Delivery" :
      order.delivery_method === "park" ? "Park/Terminal Pickup" :
      "Store Pickup";

    const { data, error } = await resend.emails.send({
      from: "Mosh Apparels <noreply@moshapparels.com>",
      replyTo: "moshapparelsofficial@gmail.com",
      to: [order.customer_email],
      subject: `Order Confirmation - ${order.order_number || order.id.substring(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; }
            .order-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f0f0f0; padding: 10px; text-align: left; }
            .total { font-size: 18px; font-weight: bold; color: #9333ea; margin-top: 20px; text-align: right; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed! 🎉</h1>
              <p>Order #${order.order_number || order.id.substring(0, 8)}</p>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name},</p>
              <p>Thank you for your order! We've received your order and will begin processing it once payment is confirmed.</p>
              
              <div class="alert">
                <strong>⚠️ Important:</strong> Please complete your payment to the account details below and keep your payment receipt.
              </div>

              <div class="order-details">
                <h2>Order Details</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style="text-align: center;">Qty</th>
                      <th style="text-align: right;">Price</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
                <div class="total">Total: ₦${order.total.toLocaleString()}</div>
              </div>

              <div class="order-details">
                <h3>Delivery Information</h3>
                <p><strong>Method:</strong> ${deliveryMethodText}</p>
                <p><strong>Address:</strong> ${order.customer_address}</p>
                <p><strong>Phone:</strong> ${order.customer_phone}</p>
              </div>

              <div class="order-details">
                <h3>Payment Information</h3>
                <p><strong>Account Name:</strong> Mosh Apparels Ventures</p>
                <p><strong>Bank:</strong> OPay</p>
                <p><strong>Account Number:</strong> 6142257816</p>
                <p style="margin-top: 15px; color: #666;">
                  <em>Please use your name "${order.customer_name}" as the payment reference.</em>
                </p>
              </div>

              <p>Once we confirm your payment, we'll send you another email with tracking information.</p>
              <p>If you have any questions about your order, please contact us.</p>
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
      console.error("Error sending order confirmation:", error);
      throw error;
    }

    console.log("Order confirmation sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-confirmation function:", error);
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

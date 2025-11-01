import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();
    console.log("Sending welcome email to:", email);

    const { data, error } = await resend.emails.send({
      from: "Mosh Apparels <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Mosh Apparels! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #9333ea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Mosh Apparels!</h1>
            </div>
            <div class="content">
              <p>Hi ${name || "there"},</p>
              <p>Thank you for joining Mosh Apparels! We're thrilled to have you as part of our fashion-forward community.</p>
              <p>Here's what you can do now:</p>
              <ul>
                <li>Browse our latest collection of trendy apparel</li>
                <li>Save your favorite items to your wishlist</li>
                <li>Enjoy seamless checkout with multiple delivery options</li>
                <li>Track your orders in real-time</li>
              </ul>
              <a href="${Deno.env.get('VITE_SUPABASE_URL')}/products" class="button">Start Shopping</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy shopping!</p>
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
      console.error("Error sending welcome email:", error);
      throw error;
    }

    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const updateOrderStatus = async (
  orderId: string,
  newStatus: string
): Promise<boolean> => {
  try {
    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) throw updateError;

    // Send status update email notification
    try {
      await supabase.functions.invoke("send-order-status-update", {
        body: { orderId, status: newStatus },
      });
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
      // Don't fail the whole operation if email fails
    }

    toast.success(`Order status updated to ${newStatus}`);
    return true;
  } catch (error: any) {
    console.error("Error updating order status:", error);
    toast.error("Failed to update order status");
    return false;
  }
};

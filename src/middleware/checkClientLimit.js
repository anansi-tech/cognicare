import { getCurrentUser } from "@/lib/auth";
import { subscriptionService } from "@/lib/subscription-service";

export async function checkClientLimit(req, res, next) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const canAddClient = await subscriptionService.checkClientLimit(user.id);
    if (!canAddClient) {
      return res.status(403).json({
        error: "Client limit reached",
        reason: "subscription_limit",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking client limit:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

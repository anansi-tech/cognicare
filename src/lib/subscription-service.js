import Stripe from "stripe";
import { connectDB } from "./mongodb";
import Subscription from "@/models/subscription";
import Client from "@/models/client";
import User from "@/models/user";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
  async createSubscription(userId, plan) {
    await connectDB();
    const user = await User.findById(userId);

    // Create Stripe customer if not exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });
      customerId = customer.id;
      await User.updateOne({ _id: userId }, { $set: { stripeCustomerId: customerId } });
    }

    // Create checkout session instead of subscription directly
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      metadata: {
        userId: userId.toString(),
        plan: plan,
      },
    });

    return {
      url: session.url,
    };
  }

  async cancelSubscription(userId) {
    await connectDB();
    const subscription = await Subscription.findOne({ userId, status: "active" });

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    try {
      // Update the subscription in Stripe to cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Get the current subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Ensure we have a valid end date
      let endDate;
      if (stripeSubscription.current_period_end) {
        endDate = new Date(stripeSubscription.current_period_end * 1000);
      } else {
        // If no end date from Stripe, set it to 30 days from now
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
      }

      // Validate the date
      if (isNaN(endDate.getTime())) {
        throw new Error("Invalid end date");
      }

      // Update the subscription record
      const updatedSubscription = await Subscription.findOneAndUpdate(
        { userId },
        {
          status: "cancelled", // Mark as cancelled even though it's active until end date
          endDate,
          autoRenew: false,
        },
        { new: true }
      );

      return updatedSubscription;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  }

  async getSubscriptionStatus(userId) {
    await connectDB();
    return await Subscription.findOne({ userId });
  }

  async checkClientLimit(userId) {
    await connectDB();
    const subscription = await this.getSubscriptionStatus(userId);
    const clientCount = await Client.countDocuments({ counselorId: userId });

    console.log("subscription", subscription);

    // If no subscription or subscription is expired, don't allow adding clients
    if (!subscription || (subscription.endDate && new Date(subscription.endDate) < new Date())) {
      return { canAdd: false, reason: "subscriptionExpired" };
    }

    if (subscription.tier === "free" && clientCount >= 3) {
      return { canAdd: false, reason: "freeLimit" };
    }
    if (subscription.tier === "paid" && clientCount >= 25) {
      return { canAdd: false, reason: "paidLimit" };
    }
    return { canAdd: true };
  }

  async createTrialSubscription(userId) {
    await connectDB();

    // Check if user already has any type of subscription
    const existingSubscription = await Subscription.findOne({ userId });
    if (existingSubscription) {
      throw new Error("User already has a subscription");
    }

    // Create trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial

    const trialSubscription = new Subscription({
      userId,
      tier: "free",
      status: "trial",
      startDate: new Date(),
      endDate: trialEndDate,
    });

    await trialSubscription.save();
    return trialSubscription;
  }

  async hasActiveSubscription(userId) {
    await connectDB();
    const subscription = await Subscription.findOne({ userId });
    return !!subscription;
  }

  async updateAutoRenew(userId, autoRenew) {
    try {
      await connectDB();

      // Get the user's subscription
      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      if (!subscription.stripeSubscriptionId) {
        throw new Error("No Stripe subscription found");
      }

      // Update the subscription in Stripe
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: !autoRenew,
      });

      // Update ONLY the autoRenew field in our database
      const updatedSubscription = await Subscription.findOneAndUpdate(
        { userId },
        {
          $set: { autoRenew }, // Only update autoRenew
        },
        { new: true }
      );

      return updatedSubscription;
    } catch (error) {
      console.error("Error updating auto-renewal:", error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import Subscription from "@/models/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      console.log("Processing checkout.session.completed webhook:", {
        sessionId: session.id,
        subscriptionId: session.subscription,
        customerId: session.customer,
        metadata: session.metadata,
      });

      // Define initial update data
      const initialUpdateData = {
        $set: {
          tier: session.metadata.plan,
          status: "active",
          startDate: new Date(),
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
        },
      };

      // Try to fetch the first invoice immediately to add to billing history
      let firstInvoiceHistory = null;
      if (session.subscription) {
        try {
          // Short delay to increase likelihood of invoice availability
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const invoices = await stripe.invoices.list({
            subscription: session.subscription,
            limit: 1, // Get the most recent (should be the first)
          });
          if (invoices.data.length > 0 && invoices.data[0].status === "paid") {
            const firstInvoice = invoices.data[0];
            console.log("Found first paid invoice during checkout completion:", {
              invoiceId: firstInvoice.id,
            });
            firstInvoiceHistory = {
              date: new Date(firstInvoice.created * 1000),
              amount: firstInvoice.amount_paid / 100,
              status: "paid",
              invoiceId: firstInvoice.id,
              paymentMethod: firstInvoice.payment_method_types?.[0] || "card",
              description: "Initial subscription payment",
            };
            // Add billing history push to the update data if found
            initialUpdateData.$push = { billingHistory: firstInvoiceHistory };
          } else {
            console.log("First invoice not found or not paid yet during checkout completion.");
          }
        } catch (invoiceError) {
          console.error("Error fetching first invoice during checkout:", invoiceError);
          // Proceed without the first invoice, rely on invoice.payment_succeeded
        }
      }

      // Update existing subscription with basic info + potentially the first invoice
      const updateResult = await Subscription.updateOne(
        { userId: session.metadata.userId },
        initialUpdateData
      );

      console.log("Subscription update result (checkout completed):", {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        acknowledged: updateResult.acknowledged,
        addedBillingHistory: !!firstInvoiceHistory,
      });

      // Verify the update
      const updatedSubscription = await Subscription.findOne({ userId: session.metadata.userId });
      console.log("Updated subscription:", {
        exists: !!updatedSubscription,
        subscriptionId: updatedSubscription?._id,
        stripeSubscriptionId: updatedSubscription?.stripeSubscriptionId,
        status: updatedSubscription?.status,
      });
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
      const subscription = event.data.object;
      console.log("Processing subscription event:", {
        eventType: event.type,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      // Only update end date if it's a valid timestamp
      const endDate = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Fallback to 30 days if no period end

      // --- Do not update status based on this event ---
      // Status should only be updated by explicit actions (cancel, checkout, delete)

      // Get the latest invoice for this subscription (for potential billing history update)
      const invoices = await stripe.invoices.list({
        subscription: subscription.id,
        limit: 1,
      });

      // Prepare data for update - only sync endDate and autoRenew
      const updateData = {
        endDate: endDate,
        autoRenew: !subscription.cancel_at_period_end,
      };

      // --- Do not add billing history from this event ---
      // Billing history should only be added by invoice.payment_succeeded

      const subscriptionUpdateResult = await Subscription.updateOne(
        { stripeSubscriptionId: subscription.id },
        updateData // Update only endDate and autoRenew
      );

      console.log("Subscription update result (customer.subscription.updated):", {
        matchedCount: subscriptionUpdateResult.matchedCount,
        modifiedCount: subscriptionUpdateResult.modifiedCount,
        acknowledged: subscriptionUpdateResult.acknowledged,
      });

      // Verify the update
      const subscriptionAfterUpdate = await Subscription.findOne({
        stripeSubscriptionId: subscription.id,
      });
      console.log("Updated subscription:", {
        exists: !!subscriptionAfterUpdate,
        subscriptionId: subscriptionAfterUpdate?._id,
        stripeSubscriptionId: subscriptionAfterUpdate?.stripeSubscriptionId,
        status: subscriptionAfterUpdate?.status,
      });
      break;

    case "customer.subscription.deleted":
      const deletedSubscription = event.data.object;
      await Subscription.updateOne(
        { stripeSubscriptionId: deletedSubscription.id },
        {
          $set: {
            status: "cancelled",
            endDate: new Date(),
          },
        }
      );
      break;

    case "invoice.payment_succeeded":
      const invoice = event.data.object;
      console.log("Processing invoice.payment_succeeded webhook:", {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        amount: invoice.amount_paid,
        created: new Date(invoice.created * 1000).toISOString(),
      });

      if (invoice.subscription) {
        const subscription = await Subscription.findOne({
          stripeSubscriptionId: invoice.subscription,
        });
        console.log("Found subscription:", {
          exists: !!subscription,
          subscriptionId: subscription?._id,
          stripeSubscriptionId: subscription?.stripeSubscriptionId,
        });

        if (subscription) {
          // Check if this invoice is already in the billing history
          const historyExists = subscription.billingHistory.some(
            (entry) => entry.invoiceId === invoice.id
          );

          if (!historyExists) {
            console.log("Invoice not found in history, adding entry:", invoice.id);
            const updateResult = await Subscription.updateOne(
              { stripeSubscriptionId: invoice.subscription },
              {
                // Only update billing history, do not change status here
                $push: {
                  billingHistory: {
                    date: new Date(invoice.created * 1000),
                    amount: invoice.amount_paid / 100, // Convert from cents to dollars
                    status: "paid",
                    invoiceId: invoice.id,
                    paymentMethod: invoice.payment_method_types?.[0] || "card",
                    description: "Subscription payment",
                  },
                },
              }
            );

            console.log("Billing history update result (invoice.payment_succeeded):", {
              matchedCount: updateResult.matchedCount,
              modifiedCount: updateResult.modifiedCount,
              acknowledged: updateResult.acknowledged,
            });
          } else {
            console.log("Invoice already exists in billing history, skipping update:", invoice.id);
          }

          // Verify the update
          const updatedSubscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription,
          });
          console.log("Updated subscription billing history:", {
            billingHistoryLength: updatedSubscription?.billingHistory?.length,
            latestEntry:
              updatedSubscription?.billingHistory?.[updatedSubscription.billingHistory.length - 1],
          });
        }
      } else {
        console.log("No subscription ID found in invoice");
      }
      break;

    case "invoice.payment_failed":
      const failedInvoice = event.data.object;
      if (failedInvoice.subscription) {
        await Subscription.updateOne(
          { stripeSubscriptionId: failedInvoice.subscription },
          {
            $set: {
              status: "past_due",
            },
            $push: {
              billingHistory: {
                date: new Date(failedInvoice.created * 1000),
                amount: failedInvoice.amount_due / 100, // Convert from cents to dollars
                status: "failed",
                invoiceId: failedInvoice.id,
                paymentMethod: failedInvoice.payment_method_types?.[0] || "card",
                description: "Failed subscription payment",
              },
            },
          }
        );
      }
      break;
  }

  return NextResponse.json({ received: true });
}

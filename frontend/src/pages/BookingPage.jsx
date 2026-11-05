import { useState } from "react";
import BookingModal from "../components/BookingModal";
import {
  createBooking,
  createPaymentOrder,
  verifyPayment
} from "../api/client";
import { useAppState } from "../state/AppContext";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function BookingPage() {
  const { selectedAdvocate, booking, setBooking, sessionGeneration } = useAppState();
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleCreateBooking = async (payload) => {
    if (saving || paying) return;
    const requestGeneration = sessionGeneration.current;
    setSaving(true);
    try {
      setError("");
      const created = await createBooking(payload);
      if (requestGeneration !== sessionGeneration.current) return;
      setBooking(created);
      setStatus("Consultation request saved. The advocate must confirm the time. Payment is optional until arranged.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayNow = async () => {
    if (paying || saving) return;
    const requestGeneration = sessionGeneration.current;
    setPaying(true);
    try {
      setError("");
      if (!booking?._id) {
        throw new Error("Create a booking first");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load");
      }

      const order = await createPaymentOrder(booking._id);

      const paymentResponse = await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: "Vakil Setu",
          description: "Legal Consultation Booking",
          order_id: order.orderId,
          handler: resolve,
          prefill: {},
          theme: { color: "#d11a2a" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled"))
          }
        });
        rzp.open();
      });

      const verified = await verifyPayment({
        bookingId: booking._id,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature
      });

      if (requestGeneration !== sessionGeneration.current) return;
      setBooking(verified.booking);
      setStatus("Payment verified. Consultation time still awaits advocate confirmation.");
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (!selectedAdvocate) {
    return (
      <main className="container">
        <section className="hero compact">
          <p className="eyebrow">Consultation</p>
          <h1>Booking</h1>
        </section>
        <p>Select an advocate first from Results page.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="hero compact">
        <p className="eyebrow">Consultation</p>
        <h1>Booking & Payment</h1>
      </section>
      <BookingModal key={selectedAdvocate._id} advocate={selectedAdvocate} onCreate={handleCreateBooking} isSubmitting={saving || paying} />
      {booking?._id && booking.paymentStatus !== "paid" ? (
        <div className="action-row">
          <button onClick={handlePayNow} disabled={paying || saving}>Pay consultation fee</button>
        </div>
      ) : null}
      {status ? <p className="success">{status}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
